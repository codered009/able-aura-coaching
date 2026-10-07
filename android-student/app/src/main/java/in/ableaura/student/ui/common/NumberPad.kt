package `in`.ableaura.student.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.ableaura.student.ui.theme.Cream
import `in`.ableaura.student.ui.theme.Teal

@Composable
fun NumberPad(
    onDigit: (String) -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
    keyHeight: Dp = 72.dp,
    textSize: Int = 28,
) {
    val rows = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf("⌫", "0", " "),
    )
    Column(
        modifier = modifier.widthIn(max = 420.dp).fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                row.forEach { key ->
                    Button(
                        onClick = {
                            when (key) {
                                "⌫" -> onDelete()
                                " " -> Unit
                                else -> onDigit(key)
                            }
                        },
                        enabled = key != " ",
                        modifier = Modifier.weight(1f).height(keyHeight),
                        colors = ButtonDefaults.buttonColors(containerColor = Teal, contentColor = Cream),
                    ) {
                        Text(key, fontSize = textSize.sp, modifier = Modifier.padding(2.dp))
                    }
                }
            }
        }
    }
}
