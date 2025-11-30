package com.edgeimpulse

data class EdgeImpulseResult(
    val label: String,
    val confidence: Float,
    val dspTime: Int,
    val classificationTime: Int,
    val anomalyTime: Int
)
