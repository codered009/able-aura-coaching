package `in`.ableaura.student.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Teal = Color(0xFF0F4F46)
val Cream = Color(0xFFF6EFE4)
val Ink = Color(0xFF1C1915)
val Terracotta = Color(0xFFC45C26)

@Composable
fun AbleAuraTheme(tv: Boolean = false, content: @Composable () -> Unit) {
    val colors = if (tv) {
        darkColorScheme(
            primary = Color(0xFFE7C4A8),
            onPrimary = Ink,
            background = Ink,
            onBackground = Cream,
            surface = Color(0xFF2A241E),
            onSurface = Cream,
            secondary = Terracotta,
        )
    } else {
        lightColorScheme(
            primary = Teal,
            onPrimary = Cream,
            background = Cream,
            onBackground = Ink,
            surface = Color.White,
            onSurface = Ink,
            secondary = Terracotta,
        )
    }
    MaterialTheme(colorScheme = colors, content = content)
}
