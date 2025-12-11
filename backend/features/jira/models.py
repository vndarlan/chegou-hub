# backend/features/jira/models.py
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet


class JiraConfig(models.Model):
    """Configuração da integração Jira com token criptografado"""

    # Configurações básicas
    jira_url = models.URLField(
        default='https://grupochegou.atlassian.net/',
        verbose_name="URL do Jira",
        help_text="URL base da instância Jira Cloud"
    )
    jira_email = models.EmailField(
        default='viniciuschegouoperacional@gmail.com',
        verbose_name="Email do Jira",
        help_text="Email do usuário Jira"
    )
    jira_project_key = models.CharField(
        max_length=50,
        default='CHEGOU',
        verbose_name="Chave do Projeto",
        help_text="Chave do projeto Jira (ex: CHEGOU)"
    )

    # Token criptografado (igual ao NicochatConfig)
    api_token_encrypted = models.TextField(
        verbose_name="API Token Criptografado",
        help_text="Token da API Jira armazenado de forma segura"
    )

    # Controle
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Se esta configuração está ativa"
    )
    ultima_sincronizacao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Sincronização"
    )

    # Metadados
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )

    class Meta:
        verbose_name = "Configuração Jira"
        verbose_name_plural = "Configurações Jira"
        ordering = ['-criado_em']

    def __str__(self):
        status = "Ativa" if self.ativo else "Inativa"
        return f"Jira Config ({status})"

    @classmethod
    def get_token(cls):
        """
        Busca o token descriptografado da configuração ativa
        Retorna None se não houver configuração ou token
        """
        try:
            config = cls.objects.filter(ativo=True).first()
            if not config or not config.api_token_encrypted:
                return None

            # Descriptografar token
            encryption_key = settings.JIRA_ENCRYPTION_KEY
            if not encryption_key:
                print("ERRO: JIRA_ENCRYPTION_KEY não configurada")
                return None

            fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
            decrypted_token = fernet.decrypt(config.api_token_encrypted.encode()).decode()

            return decrypted_token

        except Exception as e:
            print(f"Erro ao buscar token Jira: {e}")
            return None

    @classmethod
    def encrypt_token(cls, plain_token: str) -> str:
        """Criptografa um token usando Fernet"""
        encryption_key = settings.JIRA_ENCRYPTION_KEY
        if not encryption_key:
            raise ValueError("JIRA_ENCRYPTION_KEY não configurada no settings")

        fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        encrypted_token = fernet.encrypt(plain_token.encode()).decode()
        return encrypted_token

    @classmethod
    def get_config(cls):
        """Retorna a configuração ativa com token descriptografado"""
        try:
            config = cls.objects.filter(ativo=True).first()
            if not config:
                print("[JIRA] Nenhuma configuração ativa encontrada no banco")
                return None

            # Buscar token descriptografado
            api_token = cls.get_token()
            if not api_token:
                print("[JIRA] Token não pôde ser descriptografado (verifique JIRA_ENCRYPTION_KEY)")
                return None

            # Criar dict com configuração
            config_dict = {
                'jira_url': config.jira_url,
                'jira_email': config.jira_email,
                'jira_project_key': config.jira_project_key,
                'api_token': api_token,
            }

            print(f"[JIRA] Configuração carregada: {config.jira_url} | {config.jira_email} | {config.jira_project_key}")
            return config_dict

        except Exception as e:
            print(f"Erro ao buscar configuração Jira: {e}")
            return None
