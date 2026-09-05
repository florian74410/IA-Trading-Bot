import base64
import hashlib
import json
import os
import platform
import secrets
import subprocess
from pathlib import Path


class SecureStorageError(RuntimeError):
    """Raised when a secret cannot be stored or recovered safely."""


class SecureStorage:
    """Store API credentials using macOS Keychain or a local encrypted vault.

    The local vault uses a hybrid RSA/AES-GCM design. The repository name is
    used as deterministic context for deriving the key that protects the RSA
    private key. It is an identifier, not a secret; Keychain remains the
    recommended storage mode for stronger protection.
    """

    SERVICE_PREFIX = "IA-TB_Dev_Updater"
    VAULT_FILENAME = "api_vault.json"

    def __init__(self, repository_name: str, data_dir: Path):
        self.repository_name = (repository_name or "unknown-repository").strip()
        self.data_dir = Path(data_dir)
        self.vault_path = self.data_dir / self.VAULT_FILENAME

    @property
    def keychain_service(self):
        safe_repo = hashlib.sha256(self.repository_name.encode("utf-8")).hexdigest()[:24]
        return f"{self.SERVICE_PREFIX}:{safe_repo}"

    def status(self, mode: str) -> bool:
        try:
            if mode == "keychain":
                return self._keychain_get() is not None
            return self.vault_path.exists()
        except Exception:
            return False

    def save(self, api_key: str, mode: str) -> None:
        if not api_key or not api_key.strip():
            raise SecureStorageError("La clé API est vide.")
        api_key = api_key.strip()
        if mode == "keychain":
            self._keychain_set(api_key)
        elif mode == "rsa_vault":
            self._vault_save(api_key)
        else:
            raise SecureStorageError(f"Mode de stockage inconnu : {mode}")

    def load(self, mode: str):
        if mode == "keychain":
            return self._keychain_get()
        if mode == "rsa_vault":
            return self._vault_load()
        raise SecureStorageError(f"Mode de stockage inconnu : {mode}")

    def delete(self, mode: str) -> None:
        if mode == "keychain":
            self._keychain_delete()
        elif mode == "rsa_vault" and self.vault_path.exists():
            self.vault_path.unlink()

    def _keychain_set(self, value: str) -> None:
        if platform.system() != "Darwin":
            raise SecureStorageError("Le Keychain est disponible sur macOS uniquement.")
        subprocess.run(
            ["security", "add-generic-password", "-a", "openai", "-s", self.keychain_service, "-w", value, "-U"],
            check=True,
            capture_output=True,
            text=True,
        )

    def _keychain_get(self):
        if platform.system() != "Darwin":
            return None
        result = subprocess.run(
            ["security", "find-generic-password", "-a", "openai", "-s", self.keychain_service, "-w"],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return None
        return result.stdout.strip() or None

    def _keychain_delete(self) -> None:
        if platform.system() != "Darwin":
            return
        subprocess.run(
            ["security", "delete-generic-password", "-a", "openai", "-s", self.keychain_service],
            check=False,
            capture_output=True,
            text=True,
        )

    def _derive_key(self, salt: bytes) -> bytes:
        from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

        return Scrypt(salt=salt, length=32, n=2**14, r=8, p=1).derive(
            self.repository_name.encode("utf-8")
        )

    def _vault_save(self, api_key: str) -> None:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding, rsa
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        self.data_dir.mkdir(parents=True, exist_ok=True)
        salt = secrets.token_bytes(16)
        kek = self._derive_key(salt)
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key = private_key.public_key()
        private_der = private_key.private_bytes(
            serialization.Encoding.DER,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        private_nonce = secrets.token_bytes(12)
        encrypted_private = AESGCM(kek).encrypt(private_nonce, private_der, self.repository_name.encode())

        data_key = AESGCM.generate_key(bit_length=256)
        api_nonce = secrets.token_bytes(12)
        encrypted_api = AESGCM(data_key).encrypt(api_nonce, api_key.encode(), self.repository_name.encode())
        wrapped_data_key = public_key.encrypt(
            data_key,
            padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
        )

        payload = {
            "version": 1,
            "repository": self.repository_name,
            "algorithm": "RSA-2048 + AES-256-GCM + scrypt",
            "salt": base64.b64encode(salt).decode(),
            "public_key": base64.b64encode(public_key.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)).decode(),
            "encrypted_private_key": base64.b64encode(encrypted_private).decode(),
            "private_nonce": base64.b64encode(private_nonce).decode(),
            "wrapped_data_key": base64.b64encode(wrapped_data_key).decode(),
            "encrypted_api_key": base64.b64encode(encrypted_api).decode(),
            "api_nonce": base64.b64encode(api_nonce).decode(),
        }
        temporary = self.vault_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        os.chmod(temporary, 0o600)
        temporary.replace(self.vault_path)

    def _vault_load(self):
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        if not self.vault_path.exists():
            return None
        payload = json.loads(self.vault_path.read_text(encoding="utf-8"))
        if payload.get("repository") != self.repository_name:
            raise SecureStorageError("Le coffre appartient à un autre repository.")
        salt = base64.b64decode(payload["salt"])
        kek = self._derive_key(salt)
        private_der = AESGCM(kek).decrypt(
            base64.b64decode(payload["private_nonce"]),
            base64.b64decode(payload["encrypted_private_key"]),
            self.repository_name.encode(),
        )
        private_key = serialization.load_der_private_key(private_der, password=None)
        data_key = private_key.decrypt(
            base64.b64decode(payload["wrapped_data_key"]),
            padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
        )
        return AESGCM(data_key).decrypt(
            base64.b64decode(payload["api_nonce"]),
            base64.b64decode(payload["encrypted_api_key"]),
            self.repository_name.encode(),
        ).decode("utf-8")
