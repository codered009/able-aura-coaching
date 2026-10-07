package `in`.ableaura.student.realtime

import android.content.Context
import android.media.AudioManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.webrtc.AudioSource
import org.webrtc.AudioTrack
import org.webrtc.Camera2Enumerator
import org.webrtc.DataChannel
import org.webrtc.DefaultVideoDecoderFactory
import org.webrtc.DefaultVideoEncoderFactory
import org.webrtc.EglBase
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import org.webrtc.SurfaceTextureHelper
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoCapturer
import org.webrtc.VideoSource
import org.webrtc.VideoTrack

/**
 * TV: subscribe-only to the main trainer (living-room display, usually no camera).
 * Phone: publish student camera + mic so trainers can see form. Never shown to other children.
 */
class WebRtcController(
    private val context: Context,
    private val scope: CoroutineScope,
    private val signalling: SignallingClient,
    private val publishCamera: Boolean,
) {
    private val egl = EglBase.create()
    private val peers = mutableMapOf<String, PeerConnection>()
    private var factory: PeerConnectionFactory? = null
    private var localVideo: VideoTrack? = null
    private var localAudio: AudioTrack? = null
    private var capturer: VideoCapturer? = null
    private var trainerView: SurfaceViewRenderer? = null
    private var selfView: SurfaceViewRenderer? = null

    private val _privateHelp = MutableStateFlow(false)
    val privateHelp: StateFlow<Boolean> = _privateHelp
    private val _exercise = MutableStateFlow<String?>(null)
    val exercise: StateFlow<String?> = _exercise
    private val _status = MutableStateFlow("connecting")
    val status: StateFlow<String> = _status
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private var selfStudentId: String? = null
    private var started = false

    fun attachViews(trainer: SurfaceViewRenderer, self: SurfaceViewRenderer?) {
        trainerView = trainer
        selfView = self
        trainer.init(egl.eglBaseContext, null)
        trainer.setMirror(false)
        trainer.setEnableHardwareScaler(true)
        self?.init(egl.eglBaseContext, null)
        self?.setMirror(true)
    }

    fun start(signalUrl: String, sessionId: String, token: String) {
        if (started) return
        started = true
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context).createInitializationOptions(),
        )
        val encoder = DefaultVideoEncoderFactory(egl.eglBaseContext, true, true)
        val decoder = DefaultVideoDecoderFactory(egl.eglBaseContext)
        factory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoder)
            .setVideoDecoderFactory(decoder)
            .createPeerConnectionFactory()

        if (publishCamera) startCapture()

        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        audio.isSpeakerphoneOn = true

        scope.launch {
            signalling.events.collect { message -> handleSignal(message) }
        }
        signalling.connect(signalUrl, sessionId, token)
    }

    private fun startCapture() {
        val enumerator = Camera2Enumerator(context)
        val name = enumerator.deviceNames.firstOrNull { enumerator.isFrontFacing(it) }
            ?: enumerator.deviceNames.firstOrNull()
            ?: return
        val videoCapturer = enumerator.createCapturer(name, null) ?: return
        capturer = videoCapturer
        val helper = SurfaceTextureHelper.create("aa-capture", egl.eglBaseContext)
        val source: VideoSource = factory!!.createVideoSource(false)
        videoCapturer.initialize(helper, context, source.capturerObserver)
        videoCapturer.startCapture(640, 480, 24)
        localVideo = factory!!.createVideoTrack("student-video", source)
        selfView?.let { localVideo?.addSink(it) }

        val audioSource: AudioSource = factory!!.createAudioSource(MediaConstraints())
        localAudio = factory!!.createAudioTrack("student-audio", audioSource)
    }

    private fun handleSignal(message: JSONObject) {
        when (message.optString("type")) {
            "error" -> _error.value = message.optString("message")
            "joined" -> {
                _status.value = message.optString("status", "scheduled")
                selfStudentId = message.optJSONObject("you")?.optString("studentId")
                val peersJson = message.optJSONArray("peers") ?: return
                for (i in 0 until peersJson.length()) {
                    val peer = peersJson.getJSONObject(i)
                    if (peer.optString("role") == "main_trainer") {
                        call(peer.getString("peerId"))
                    }
                }
            }
            "peer-joined" -> {
                val peer = message.getJSONObject("peer")
                if (peer.optString("role") == "main_trainer") {
                    call(peer.getString("peerId"))
                }
            }
            "peer-left" -> closePeer(message.getString("peerId"))
            "offer" -> onRemoteOffer(message)
            "answer" -> onRemoteAnswer(message)
            "ice" -> onRemoteIce(message)
            "session-state" -> _status.value = message.optString("status")
            "exercise" -> _exercise.value = message.optString("exerciseId")
            "private-audio-open" -> {
                if (message.optString("studentId") == selfStudentId) _privateHelp.value = true
            }
            "private-audio-close" -> {
                if (message.optString("studentId") == selfStudentId) _privateHelp.value = false
            }
        }
    }

    private fun call(peerId: String) {
        val pc = peer(peerId)
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        }
        pc.createOffer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(sdp: SessionDescription) {
                pc.setLocalDescription(SimpleSdpObserver(), sdp)
                signalling.send(
                    JSONObject()
                        .put("type", "offer")
                        .put("to", peerId)
                        .put("sdp", sdp.description)
                        .put("kind", "media"),
                )
            }
        }, constraints)
    }

    private fun onRemoteOffer(message: JSONObject) {
        val from = message.getString("from")
        val pc = peer(from)
        pc.setRemoteDescription(
            SimpleSdpObserver(),
            SessionDescription(SessionDescription.Type.OFFER, message.getString("sdp")),
        )
        pc.createAnswer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(sdp: SessionDescription) {
                pc.setLocalDescription(SimpleSdpObserver(), sdp)
                signalling.send(
                    JSONObject()
                        .put("type", "answer")
                        .put("to", from)
                        .put("sdp", sdp.description)
                        .put("kind", message.optString("kind", "media")),
                )
            }
        }, MediaConstraints())
    }

    private fun onRemoteAnswer(message: JSONObject) {
        peer(message.getString("from")).setRemoteDescription(
            SimpleSdpObserver(),
            SessionDescription(SessionDescription.Type.ANSWER, message.getString("sdp")),
        )
    }

    private fun onRemoteIce(message: JSONObject) {
        val raw = JSONObject(message.getString("candidate"))
        peer(message.getString("from")).addIceCandidate(
            IceCandidate(
                raw.optString("sdpMid"),
                raw.optInt("sdpMLineIndex"),
                raw.optString("candidate"),
            ),
        )
    }

    private fun peer(peerId: String): PeerConnection {
        peers[peerId]?.let { return it }
        val ice = listOf(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer())
        val pc = factory!!.createPeerConnection(
            PeerConnection.RTCConfiguration(ice),
            object : PeerConnection.Observer {
                override fun onIceCandidate(candidate: IceCandidate) {
                    signalling.send(
                        JSONObject()
                            .put("type", "ice")
                            .put("to", peerId)
                            .put("candidate", JSONObject()
                                .put("sdpMid", candidate.sdpMid)
                                .put("sdpMLineIndex", candidate.sdpMLineIndex)
                                .put("candidate", candidate.sdp)
                                .toString())
                            .put("kind", "media"),
                    )
                }

                override fun onAddStream(stream: MediaStream) {
                    stream.videoTracks.firstOrNull()?.addSink(trainerView)
                    stream.audioTracks.firstOrNull()?.setEnabled(true)
                }

                override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) = Unit
                override fun onSignalingChange(state: PeerConnection.SignalingState) = Unit
                override fun onIceConnectionReceivingChange(receiving: Boolean) = Unit
                override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) = Unit
                override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) = Unit
                override fun onAddTrack(receiver: RtpReceiver, streams: Array<out MediaStream>) {
                    (receiver.track() as? VideoTrack)?.addSink(trainerView)
                }
                override fun onRemoveStream(stream: MediaStream) = Unit
                override fun onDataChannel(channel: DataChannel) = Unit
                override fun onRenegotiationNeeded() = Unit
            },
        )!!
        localAudio?.let { pc.addTrack(it) }
        localVideo?.let { pc.addTrack(it) }
        peers[peerId] = pc
        return pc
    }

    private fun closePeer(peerId: String) {
        peers.remove(peerId)?.dispose()
    }

    fun release() {
        signalling.send(JSONObject().put("type", "leave"))
        signalling.close()
        capturer?.stopCapture()
        capturer?.dispose()
        peers.values.forEach { it.dispose() }
        peers.clear()
        localVideo?.dispose()
        localAudio?.dispose()
        factory?.dispose()
        trainerView?.release()
        selfView?.release()
        egl.release()
    }
}

open class SimpleSdpObserver : SdpObserver {
    override fun onCreateSuccess(sdp: SessionDescription) = Unit
    override fun onSetSuccess() = Unit
    override fun onCreateFailure(error: String) = Unit
    override fun onSetFailure(error: String) = Unit
}
