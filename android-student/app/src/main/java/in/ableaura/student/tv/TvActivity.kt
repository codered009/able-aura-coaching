package `in`.ableaura.student.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import `in`.ableaura.student.ui.theme.AbleAuraTheme

class TvActivity : ComponentActivity() {
    private val model: TvViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AbleAuraTheme(tv = true) {
                val screen by model.screen.collectAsState()
                when (val current = screen) {
                    TvScreen.Server -> TvServerScreen(model)
                    TvScreen.SignIn -> TvSignInScreen(model)
                    TvScreen.Join -> TvJoinScreen(model)
                    is TvScreen.Live -> TvLiveScreen(
                        model = model,
                        session = current.session,
                        onLeave = { model.leaveClass(); finish() },
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
