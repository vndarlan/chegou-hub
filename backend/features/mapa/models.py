from django.db import models

class StatusPais(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    descricao = models.CharField(max_length=100)
    cor_hex = models.CharField(max_length=7, default="#4CAF50")
    ordem = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = "Status do País"
        verbose_name_plural = "Status dos Países"
        ordering = ['ordem']
    
    def __str__(self):
        return self.nome

class Pais(models.Model):
    nome_display = models.CharField(max_length=100)
    nome_geojson = models.CharField(max_length=100)
    status = models.ForeignKey(StatusPais, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "País"
        verbose_name_plural = "Países"
        ordering = ['nome_display']
    
    def __str__(self):
        return f"{self.nome_display} - {self.status.nome}"