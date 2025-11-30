package com.edgeimpulse

data class EdgeImpulseModelInfo(
    val name: String,
    val projectId: Int,
    val labels: Array<String>,
    val frequency: Int,
    val threshold: Float
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as EdgeImpulseModelInfo

        if (name != other.name) return false
        if (projectId != other.projectId) return false
        if (!labels.contentEquals(other.labels)) return false
        if (frequency != other.frequency) return false
        if (threshold != other.threshold) return false

        return true
    }

    override fun hashCode(): Int {
        var result = name.hashCode()
        result = 31 * result + projectId
        result = 31 * result + labels.contentHashCode()
        result = 31 * result + frequency
        result = 31 * result + threshold.hashCode()
        return result
    }
}
