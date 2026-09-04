from .base import BaseAgent


class ArchivisteAgent(BaseAgent):

    def __init__(self):

        super().__init__(
            "archiviste",
            "Archiviste",
            "Agent chargé des sauvegardes et de l'organisation."
        )

    def run(self):

        self.running = True

        return (
            "Archiviste : système d'archivage prêt."
        )
