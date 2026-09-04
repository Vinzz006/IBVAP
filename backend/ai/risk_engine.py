from typing import Dict, Any, List

class RiskEngine:
    """
    Transparent rule-based prototype risk prioritization engine.
    Calculates a risk score (0-100) and maps to LOW, MEDIUM, HIGH, CRITICAL.
    Provides detailed factor breakdown for operator review.
    """

    @staticmethod
    def calculate_risk(
        object_type: str,
        is_intrusion: bool,
        is_night: bool,
        dwell_time: float,
        is_heading_perimeter: bool = False,
        is_loitering: bool = False
    ) -> Dict[str, Any]:
        score = 0
        breakdown: List[Dict[str, Any]] = []

        # Factor 1: Object presence
        if object_type.lower() == "person":
            score += 10
            breakdown.append({"factor": "Person Detected", "points": 10})
        elif object_type.lower() in ["car", "motorcycle", "truck", "bus"]:
            score += 10
            breakdown.append({f"factor": f"Vehicle Detected ({object_type.capitalize()})", "points": 10})
        else:
            score += 5
            breakdown.append({"factor": "Monitored Target Detected", "points": 5})

        # Factor 2: Restricted zone intrusion
        if is_intrusion:
            score += 40
            breakdown.append({"factor": "Restricted-Zone Intrusion", "points": 40})

        # Factor 3: Night-time activity
        if is_night:
            score += 15
            breakdown.append({"factor": "Night-Time / Low-Light Movement", "points": 15})

        # Factor 4: Heading towards monitored perimeter
        if is_heading_perimeter:
            score += 20
            breakdown.append({"factor": "Vector Directed Towards Perimeter", "points": 20})

        # Factor 5: Prolonged presence / loitering (> 10s)
        if is_loitering or dwell_time > 10.0:
            score += 15
            breakdown.append({"factor": f"Prolonged Dwell Time ({round(dwell_time, 1)}s)", "points": 15})

        # Cap score at 100
        total_score = min(100, score)

        # Categorize risk level
        if total_score >= 80:
            risk_level = "CRITICAL"
        elif total_score >= 60:
            risk_level = "HIGH"
        elif total_score >= 30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "risk_score": total_score,
            "risk_level": risk_level,
            "breakdown": breakdown,
            "label": f"Prototype Risk Score: {total_score}/100 ({risk_level})"
        }
