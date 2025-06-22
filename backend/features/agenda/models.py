from django.db import models

class ManagedCalendar(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name="Nome do Calendário",
        help_text="Um nome descritivo para o calendário (Ex: Marketing, Feriados)."
    )
    iframe_code = models.TextField(
        verbose_name="Código Iframe do Google Calendar",
        help_text="Cole aqui o código iframe completo obtido do Google Calendar.",
        unique=True,
        null=True,
        blank=True
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")

    class Meta:
        verbose_name = "Calendário Gerenciado (Iframe)"
        verbose_name_plural = "Calendários Gerenciados (Iframe)"
        ordering = ['name']

    def __str__(self):
        src_start = self.iframe_code.find('src="') if self.iframe_code else -1
        src_end = self.iframe_code.find('"', src_start + 5) if src_start != -1 else -1
        if src_start != -1 and src_end != -1:
            src_preview = self.iframe_code[src_start+5:src_end]
            return f"{self.name} ({src_preview[:50]}...)"
        else:
            return f"{self.name} (iframe inválido ou vazio)"