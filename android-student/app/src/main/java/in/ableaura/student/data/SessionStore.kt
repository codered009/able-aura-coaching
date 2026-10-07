package `in`.ableaura.student.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import `in`.ableaura.student.BuildConfig
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("able_aura")

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val nameKey = stringPreferencesKey("name")
    private val roleKey = stringPreferencesKey("role")
    private val studentIdKey = stringPreferencesKey("student_id")
    private val phoneKey = stringPreferencesKey("phone")
    private val apiKey = stringPreferencesKey("api_base")
    private val signalKey = stringPreferencesKey("signal_url")

    suspend fun session(): AuthSession? {
        val prefs = context.dataStore.data.first()
        val token = prefs[tokenKey] ?: return null
        return AuthSession(
            token = token,
            userId = prefs[userIdKey].orEmpty(),
            name = prefs[nameKey].orEmpty(),
            role = prefs[roleKey].orEmpty(),
            studentId = prefs[studentIdKey],
            phone = prefs[phoneKey].orEmpty(),
        )
    }

    suspend fun save(session: AuthSession) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = session.token
            prefs[userIdKey] = session.userId
            prefs[nameKey] = session.name
            prefs[roleKey] = session.role
            prefs[phoneKey] = session.phone
            if (session.studentId.isNullOrBlank()) prefs.remove(studentIdKey)
            else prefs[studentIdKey] = session.studentId
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    suspend fun server(): ServerConfig {
        val prefs = context.dataStore.data.first()
        return ServerConfig(
            apiBase = prefs[apiKey] ?: BuildConfig.API_BASE_URL,
            signalUrl = prefs[signalKey] ?: BuildConfig.SIGNAL_URL,
        )
    }

    suspend fun saveServer(apiBase: String, signalUrl: String) {
        context.dataStore.edit {
            it[apiKey] = apiBase.trim().trimEnd('/')
            it[signalKey] = signalUrl.trim()
        }
    }

    fun sessionFlow() = context.dataStore.data.map { prefs ->
        prefs[tokenKey]?.let {
            AuthSession(
                token = it,
                userId = prefs[userIdKey].orEmpty(),
                name = prefs[nameKey].orEmpty(),
                role = prefs[roleKey].orEmpty(),
                studentId = prefs[studentIdKey],
                phone = prefs[phoneKey].orEmpty(),
            )
        }
    }
}
