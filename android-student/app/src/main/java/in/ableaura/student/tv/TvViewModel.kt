package `in`.ableaura.student.tv

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import `in`.ableaura.student.data.AbleAuraApi
import `in`.ableaura.student.data.AuthSession
import `in`.ableaura.student.data.SessionStore
import `in`.ableaura.student.data.SessionSummary
import `in`.ableaura.student.realtime.SignallingClient
import `in`.ableaura.student.realtime.WebRtcController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class TvScreen {
    data object Server : TvScreen()
    data object SignIn : TvScreen()
    data object Join : TvScreen()
    data class Live(val session: SessionSummary) : TvScreen()
}

class TvViewModel(app: Application) : AndroidViewModel(app) {
    private val store = SessionStore(app)
    private val api = AbleAuraApi(store)

    val screen = MutableStateFlow<TvScreen>(TvScreen.SignIn)
    val phone = MutableStateFlow("9800000006")
    val otp = MutableStateFlow("123456")
    val joinCode = MutableStateFlow("482913")
    val apiBase = MutableStateFlow("")
    val signalUrl = MutableStateFlow("")
    val message = MutableStateFlow<String?>(null)
    val busy = MutableStateFlow(false)
    val session: StateFlow<AuthSession?> = MutableStateFlow(null)

    var webrtc: WebRtcController? = null
        private set
    var publishCamera: Boolean = false
    private val signalling = SignallingClient()

    init {
        viewModelScope.launch {
            val saved = store.session()
            val server = store.server()
            apiBase.value = server.apiBase
            signalUrl.value = server.signalUrl
            (session as MutableStateFlow).value = saved
            screen.value = if (saved == null) TvScreen.SignIn else TvScreen.Join
        }
    }

    fun openServer() {
        screen.value = TvScreen.Server
    }

    fun saveServer() {
        viewModelScope.launch {
            store.saveServer(apiBase.value, signalUrl.value)
            screen.value = if (store.session() == null) TvScreen.SignIn else TvScreen.Join
        }
    }

    fun sendOtp() {
        viewModelScope.launch {
            busy.value = true
            message.value = null
            try {
                val demo = api.requestOtp(phone.value)
                if (demo.isNotBlank()) otp.value = demo
                message.value = "OTP sent. Use the remote to enter it."
            } catch (error: Exception) {
                message.value = error.message
            } finally {
                busy.value = false
            }
        }
    }

    fun verify() {
        viewModelScope.launch {
            busy.value = true
            message.value = null
            try {
                val auth = api.verifyOtp(phone.value, otp.value)
                (session as MutableStateFlow).value = auth
                screen.value = TvScreen.Join
            } catch (error: Exception) {
                message.value = error.message
            } finally {
                busy.value = false
            }
        }
    }

    fun joinClass() {
        viewModelScope.launch {
            busy.value = true
            message.value = null
            try {
                val found = api.lookupSession(joinCode.value)
                api.joinSession(found.id, joinCode.value)
                webrtc = WebRtcController(
                    context = getApplication(),
                    scope = viewModelScope,
                    signalling = signalling,
                    publishCamera = publishCamera,
                )
                screen.value = TvScreen.Live(found)
            } catch (error: Exception) {
                message.value = error.message
            } finally {
                busy.value = false
            }
        }
    }

    fun startLive(sessionId: String) {
        viewModelScope.launch {
            val token = store.session()?.token ?: return@launch
            val server = store.server()
            webrtc?.start(server.signalUrl, sessionId, token)
        }
    }

    fun leaveClass() {
        releaseLive()
        screen.value = TvScreen.Join
    }

    fun releaseLive() {
        webrtc?.release()
        webrtc = null
    }
}
