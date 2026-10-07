package `in`.ableaura.student.realtime

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SignallingClient {
    private val http = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()
    private var socket: WebSocket? = null

    private val _events = MutableSharedFlow<JSONObject>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<JSONObject> = _events

    fun connect(signalUrl: String, sessionId: String, token: String) {
        close()
        val request = Request.Builder().url(signalUrl).build()
        socket = http.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                webSocket.send(
                    JSONObject()
                        .put("type", "join")
                        .put("sessionId", sessionId)
                        .put("token", token)
                        .toString(),
                )
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                _events.tryEmit(JSONObject(text))
            }
        })
    }

    fun send(payload: JSONObject) {
        socket?.send(payload.toString())
    }

    fun close() {
        socket?.close(1000, "leave")
        socket = null
    }
}
