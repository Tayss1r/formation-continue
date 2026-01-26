"""
Constants and controlled lists for the application.
Centralized to ensure consistency across all modules.
"""

from enum import Enum
from typing import List


class IndustrySector(str, Enum):
    """
    Controlled list of industry sectors.
    Used for:
    - Company profiles
    - Course categorization
    - Newsletter subscriptions
    """
    IT = "IT"
    MANUFACTURING = "Manufacturing"
    FINANCE = "Finance"
    ENERGY = "Energy"
    HEALTHCARE = "Healthcare"
    EDUCATION = "Education"
    RETAIL = "Retail"
    CONSTRUCTION = "Construction"
    TRANSPORT = "Transport"
    AGRICULTURE = "Agriculture"
    TELECOMMUNICATIONS = "Telecommunications"
    HOSPITALITY = "Hospitality"
    CONSULTING = "Consulting"
    LEGAL = "Legal"
    MEDIA = "Media"
    PHARMACEUTICAL = "Pharmaceutical"
    REAL_ESTATE = "Real Estate"
    OTHER = "Other"

    @classmethod
    def values(cls) -> List[str]:
        """Get list of all sector values"""
        return [sector.value for sector in cls]
    
    @classmethod
    def is_valid(cls, sector: str) -> bool:
        """Check if a sector string is valid"""
        return sector in cls.values()


# List of all valid sectors (for quick validation)
VALID_SECTORS = IndustrySector.values()


def validate_sector(sector: str) -> bool:
    """Validate that a sector is in the controlled list"""
    return IndustrySector.is_valid(sector)
