package `in`.ableaura.student.pose

/**
 * Phone-only. TV does not run pose — the living-room screen only shows the trainer.
 * Landmarks and derived metrics may be posted to /api/sessions/:id/ai-events.
 * Raw video is never uploaded unless a trainer requests a short clip.
 * MediaPipe Tasks Vision is the default on-device engine.
 */
class OnDevicePoseClient {
    fun start(onLandmarks: (List<FloatArray>) -> Unit) {
        onLandmarks(emptyList())
    }

    fun stop() = Unit
}
