package `in`.ableaura.student.phone

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import `in`.ableaura.student.tv.TvScreen
import `in`.ableaura.student.tv.TvViewModel
import `in`.ableaura.student.ui.theme.AbleAuraTheme

class PhoneActivity : ComponentActivity() {
    private val model: TvViewModel by viewModels()
    private val permission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        permission.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        model.publishCamera = true
        setContent {
            AbleAuraTheme(tv = false) {
                val screen by model.screen.collectAsState()
                when (val current = screen) {
                    TvScreen.Server -> PhoneServerScreen(model)
                    TvScreen.SignIn -> PhoneSignInScreen(model)
                    TvScreen.Join -> PhoneJoinScreen(model)
                    is TvScreen.Live -> PhoneLiveScreen(
                        model = model,
                        session = current.session,
                        onLeave = { model.leaveClass() },
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        model.releaseLive()
        super.onDestroy()
    }
}
