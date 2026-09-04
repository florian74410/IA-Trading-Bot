import subprocess


class SecretStore:

    SERVICE = "IA-TB_Dev_Updater"

    def set(self, name, value):

        subprocess.run(
            [
                "security",
                "add-generic-password",
                "-a",
                name,
                "-s",
                self.SERVICE,
                "-w",
                value,
                "-U"
            ],
            check=True,
            capture_output=True
        )

    def get(self, name):

        result = subprocess.run(
            [
                "security",
                "find-generic-password",
                "-a",
                name,
                "-s",
                self.SERVICE,
                "-w"
            ],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode != 0:

            return None

        return result.stdout.strip()
