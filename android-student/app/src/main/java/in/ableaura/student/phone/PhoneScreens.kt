package `in`.ableaura.student.phone

import android.view.ViewGroup
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import `in`.ableaura.student.tv.TvViewModel
import `in`.ableaura.student.ui.common.NumberPad
import `in`.ableaura.student.ui.theme.Cream
import `in`.ableaura.student.ui.theme.Ink
import `in`.ableaura.student.ui.theme.Teal
import org.webrtc.RendererCommon
import org.webrtc.SurfaceViewRenderer

@Composable
fun PhoneServerScreen(model: TvViewModel) {
    val api by model.apiBase.collectAsState()
    val signal by model.signalUrl.collectAsState()
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("Server", fontSize = 32.sp)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = api, onValueChange = { model.apiBase.value = it }, label = { Text("API") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = signal, onValueChange = { model.signalUrl.value = it }, label = { Text("Signalling") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(16.dp))
        Button(onClick = { model.saveServer() }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text("Save")
        }
    }
}

@Composable
fun PhoneSignInScreen(model: TvViewModel) {
    val phone by model.phone.collectAsState()
    val otp by model.otp.collectAsState()
    val message by model.message.collectAsState()
    val busy by model.busy.collectAsState()
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("Able Aura", fontSize = 36.sp)
        Text("Your trainer can see you. The helper never talks.", modifier = Modifier.padding(top = 8.dp, bottom = 20.dp))
        OutlinedTextField(value = phone, onValueChange = { model.phone.value = it.filter(Char::isDigit).take(10) }, label = { Text("Mobile") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = otp, onValueChange = { model.otp.value = it.filter(Char::isDigit).take(6) }, label = { Text("OTP") }, modifier = Modifier.fillMaxWidth())
        if (message != null) Text(message!!, modifier = Modifier.padding(top = 8.dp))
        Spacer(Modifier.height(16.dp))
        Button(onClick = { model.sendOtp() }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text("Send OTP") }
        Spacer(Modifier.height(8.dp))
        Button(onClick = { model.verify() }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text("Enter class desk") }
        Button(onClick = { model.openServer() }, modifier = Modifier.padding(top = 8.dp)) { Text("Change server") }
    }
}

@Composable
fun PhoneJoinScreen(model: TvViewModel) {
    val code by model.joinCode.collectAsState()
    val message by model.message.collectAsState()
    val busy by model.busy.collectAsState()
    Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Class code", fontSize = 32.sp)
        Text(code.ifBlank { "••••••" }, fontSize = 48.sp, modifier = Modifier.padding(vertical = 16.dp))
        NumberPad(
            onDigit = { if (code.length < 6) model.joinCode.value = code + it },
            onDelete = { model.joinCode.value = code.dropLast(1) },
            keyHeight = 64.dp,
            textSize = 24,
        )
        if (message != null) Text(message!!, modifier = Modifier.padding(top = 12.dp))
        Button(
            onClick = { model.joinClass() },
            enabled = !busy && code.length == 6,
            modifier = Modifier.padding(top = 20.dp).fillMaxWidth().height(64.dp),
        ) { Text("Enter the room", fontSize = 20.sp) }
    }
}

@Composable
fun PhoneLiveScreen(model: TvViewModel, session: SessionSummary, onLeave: () -> Unit) {
    val privateHelp by (model.webrtc?.privateHelp ?: kotlinx.coroutines.flow.MutableStateFlow(false)).collectAsState()
    Box(Modifier.fillMaxSize().background(Ink)) {
        AndroidView(
            factory = { context ->
                val trainer = SurfaceViewRenderer(context).apply {
                    setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FIT)
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                }
                val self = SurfaceViewRenderer(context)
                model.webrtc?.attachViews(trainer, self)
                model.startLive(session.id)
                trainer
            },
            modifier = Modifier.fillMaxSize(),
        )
        Column(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color(0xCC1C1915)).padding(16.dp),
        ) {
            Text(session.title, color = Cream, fontSize = 22.sp)
            if (privateHelp) {
                Text("Your trainer is helping you privately. Keep going.", color = Color.White, fontSize = 18.sp)
            }
            Button(
                onClick = onLeave,
                colors = ButtonDefaults.buttonColors(containerColor = Teal),
                modifier = Modifier.padding(top = 8.dp),
            ) { Text("Leave class") }
        }
    }
}
