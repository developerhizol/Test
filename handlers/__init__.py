from .start import router as start_router
from .about_service import router as about_service_router
from .help import router as help_router
from .connect import router as connect_router
from .admin import router as admin_router

__all__ = ["start_router", "about_service_router", "help_router", "connect_router", "admin_router"]