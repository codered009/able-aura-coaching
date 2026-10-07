package `in`.ableaura.student.tv

import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import `in`.ableaura.student.data.SessionSummary
import `in`.ableaura.student.ui.common.NumberPad
import `in`.ableaura.student.ui.theme.Cream
import `in`.ableaura.student.ui.theme.Ink
import `in`.ableaura.student.ui.theme.Teal
import org.webrtc.RendererCommon
import org.webrtc.SurfaceViewRenderer

@Composable
fun TvServerScreen(model: TvViewModel) {
    val api by model.apiBase.collectAsState()
    val signal by model.signalUrl.collectAsState()
    Column(
        Modifier.fillMaxSize().background(Ink).padding(56.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Where is Able Aura?", color = Cream, fontSize = 42.sp)
        Text(
            "On a TV emulator use 10.0.2.2. On a living-room Google TV use your computer’s LAN IP.",
            color = Cream.copy(alpha = 0.7f),
            fontSize = 20.sp,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
        )
        OutlinedTextField(value = api, onValueChange = { model.apiBase.value = it }, label = { Text("API") })
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = signal, onValueChange = { model.signalUrl.value = it }, label = { Text("Signalling") })
        Spacer(Modifier.height(24.dp))
        Button(onClick = { model.saveServer() }) { Text("Save and continue", fontSize = 22.sp) }
    }
}

@Composable
fun TvSignInScreen(model: TvViewModel) {
    val phone by model.phone.collectAsState()
    val otp by model.otp.collectAsState()
    val message by model.message.collectAsState()
    val busy by model.busy.collectAsState()
    Row(Modifier.fillMaxSize().background(Ink).padding(48.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
            Text("Able Aura on your TV", color = Cream, fontSize = 48.sp)
            Text(
                "The helper never talks. Only your trainer appears on this screen.",
                color = Cream.copy(alpha = 0.7f),
                fontSize = 22.sp,
                modifier = Modifier.padding(top = 12.dp, bottom = 28.dp),
            )
            Text("Mobile  $phone", color = Cream, fontSize = 28.sp)
            Text("OTP     $otp", color = Cream, fontSize = 28.sp, modifier = Modifier.padding(top = 8.dp))
            if (message != null) {
                Text(message!!, color = Color(0xFFE7C4A8), modifier = Modifier.padding(top = 16.dp), fontSize = 20.sp)
            }
            Row(Modifier.padding(top = 28.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(onClick = { model.sendOtp() }, enabled = !busy) { Text("Send OTP", fontSize = 20.sp) }
                Button(onClick = { model.verify() }, enabled = !busy) { Text("Enter", fontSize = 20.sp) }
                Button(onClick = { model.openServer() }) { Text("Server", fontSize = 20.sp) }
            }
        }
        NumberPad(
            onDigit = { digit ->
                if (phone.length < 10) model.phone.value += digit
                else if (otp.length < 6) model.otp.value += digit
            },
            onDelete = {
                if (otp.isNotEmpty() && phone.length >= 10) model.otp.value = otp.dropLast(1)
                else model.phone.value = phone.dropLast(1)
            },
            modifier = Modifier.width(420.dp).align(Alignment.CenterVertically),
        )
    }
}

@Composable
fun TvJoinScreen(model: TvViewModel) {
    val code by model.joinCode.collectAsState()
    val message by model.message.collectAsState()
    val busy by model.busy.collectAsState()
    val session by model.session.collectAsState()
    Row(Modifier.fillMaxSize().background(Ink).padding(48.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("Hi ${session?.name ?: "there"}", color = Cream, fontSize = 46.sp)
            Text("Type the class code with the remote.", color = Cream.copy(alpha = 0.7f), fontSize = 22.sp)
            Text(
                code.ifBlank { "••••••" },
                color = Cream,
                fontSize = 64.sp,
                modifier = Modifier.padding(vertical = 24.dp),
            )
            if (message != null) Text(message!!, color = Color(0xFFE7C4A8), fontSize = 20.sp)
            Button(
                onClick = { model.joinClass() },
                enabled = !busy && code.length == 6,
                modifier = Modifier.padding(top = 20.dp).height(72.dp),
            ) { Text("Join class", fontSize = 24.sp) }
        }
        NumberPad(
            onDigit = { if (code.length < 6) model.joinCode.value = code + it },
            onDelete = { model.joinCode.value = code.dropLast(1) },
            modifier = Modifier.width(420.dp),
        )
    }
}

@Composable
fun TvLiveScreen(model: TvViewModel, session: SessionSummary, onLeave: () -> Unit) {
    val privateHelp by (model.webrtc?.privateHelp ?: kotlinx.coroutines.flow.MutableStateFlow(false)).collectAsState()
    val status by (model.webrtc?.status ?: kotlinx.coroutines.flow.MutableStateFlow(session.status)).collectAsState()
    val error by (model.webrtc?.error ?: kotlinx.coroutines.flow.MutableStateFlow(null as String?)).collectAsState()

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            factory = { context ->
                SurfaceViewRenderer(context).apply {
                    setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FIT)
                    keepScreenOn = true
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    model.webrtc?.attachViews(this, null)
                    model.startLive(session.id)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        Column(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color(0xCC1C1915)).padding(28.dp),
        ) {
            Text(session.title, color = Cream, fontSize = 32.sp)
            Text(
                "${session.trainerName}  ·  ${session.courseName}  ·  $status",
                color = Cream.copy(alpha = 0.7f),
                fontSize = 18.sp,
            )
            if (privateHelp) {
                Text(
                    "Your trainer is helping you privately. Keep going.",
                    color = Color.White,
                    fontSize = 26.sp,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
            if (error != null) {
                Text(error!!, color = Color(0xFFE7C4A8), modifier = Modifier.padding(top = 8.dp))
            }
            Button(
                onClick = onLeave,
                modifier = Modifier.padding(top = 12.dp),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Teal),
            ) { Text("Leave class") }
        }
    }
}
