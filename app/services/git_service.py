import subprocess


class GitService:

    def version(self):

        try:

            result = subprocess.run(
                ["git", "--version"],
                capture_output=True,
                text=True,
                check=True
            )

            return result.stdout.strip()

        except Exception as exc:

            return (
                f"Git indisponible : {exc}"
            )

    def status(self, path):

        try:

            result = subprocess.run(
                [
                    "git",
                    "-C",
                    str(path),
                    "status",
                    "--short"
                ],
                capture_output=True,
                text=True,
                check=False
            )

            return result.stdout.strip()

        except Exception as exc:

            return (
                f"Erreur Git : {exc}"
            )
