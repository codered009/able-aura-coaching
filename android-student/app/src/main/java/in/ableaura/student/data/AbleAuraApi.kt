package `in`.ableaura.student.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AbleAuraApi(
    private val store: SessionStore,
) {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    suspend fun requestOtp(phone: String): String {
        val body = JSONObject().put("phone", phone)
        val json = post("/api/auth/otp", body)
        if (json.has("error")) throw ApiException(json.getString("error"))
        return json.optString("demoCode").ifBlank { "" }
    }

    suspend fun verifyOtp(phone: String, code: String): AuthSession {
        val body = JSONObject().put("phone", phone).put("code", code)
        val json = post("/api/auth/verify", body)
        if (json.has("error")) throw ApiException(json.getString("error"))
        val token = json.optString("token")
        if (token.isBlank()) throw ApiException("Sign-in did not return a session token.")
        val session = AuthSession(
            token = token,
            userId = json.getString("id"),
            name = json.getString("name"),
            role = json.getString("role"),
            studentId = json.optString("studentId").ifBlank { null },
            phone = json.optString("phone", phone),
        )
        store.save(session)
        return session
    }

    suspend fun lookupSession(code: String): SessionSummary {
        val json = get("/api/sessions/lookup?code=${code.trim()}")
        if (json.has("error")) throw ApiException(json.getString("error"))
        return SessionSummary(
            id = json.getString("id"),
            title = json.getString("title"),
            joinCode = json.getString("joinCode"),
            status = json.getString("status"),
            courseName = json.optJSONObject("course")?.optString("name").orEmpty(),
            trainerName = json.optJSONObject("mainTrainer")?.optString("name").orEmpty(),
            exerciseName = json.optJSONObject("currentExercise")?.optString("name"),
        )
    }

    suspend fun joinSession(sessionId: String, joinCode: String) {
        val body = JSONObject().put("joinCode", joinCode)
        val json = post("/api/sessions/$sessionId/join", body)
        if (json.has("error")) throw ApiException(json.getString("error"))
    }

    private suspend fun get(path: String): JSONObject = execute(
        Request.Builder().url(url(path)).header("Cookie", cookie()).get().build(),
    )

    private suspend fun post(path: String, body: JSONObject): JSONObject = execute(
        Request.Builder()
            .url(url(path))
            .header("Cookie", cookie())
            .post(body.toString().toRequestBody(jsonType))
            .build(),
    )

    private suspend fun url(path: String): String {
        val base = store.server().apiBase
        return base + path
    }

    private suspend fun cookie(): String {
        val token = store.session()?.token ?: return ""
        return "aa_session=$token"
    }

    private suspend fun execute(request: Request): JSONObject = withContext(Dispatchers.IO) {
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (text.isBlank()) JSONObject() else JSONObject(text)
        }
    }
}

class ApiException(message: String) : Exception(message)
