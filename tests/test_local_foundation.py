import logging
from pathlib import Path

from app.core import logging_setup
from app.core.logging_setup import LOG_FILENAME, setup_logging


def test_setup_logging_creates_rotating_log_file(tmp_path: Path):
    logger = logging.getLogger(logging_setup.LOGGER_NAME)
    for handler in list(logger.handlers):
        handler.close()
        logger.removeHandler(handler)

    configured = setup_logging(tmp_path)
    configured.info("local foundation test")

    for handler in configured.handlers:
        handler.flush()

    log_file = tmp_path / LOG_FILENAME
    assert log_file.exists()
    assert "local foundation test" in log_file.read_text(encoding="utf-8")

    for handler in list(configured.handlers):
        handler.close()
        configured.removeHandler(handler)
