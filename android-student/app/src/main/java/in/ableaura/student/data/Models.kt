package `in`.ableaura.student.data

data class AuthSession(
    val token: String,
    val userId: String,
    val name: String,
    val role: String,
    val studentId: String?,
    val phone: String,
)

data class SessionSummary(
    val id: String,
    val title: String,
    val joinCode: String,
    val status: String,
    val courseName: String,
    val trainerName: String,
    val exerciseName: String?,
)

data class ServerConfig(
    val apiBase: String,
    val signalUrl: String,
)
