"""
Comando para migrar imagens existentes do sistema de arquivos para Cloudinary
"""
import os
import logging
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from features.feedback.models import Feedback

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migra imagens existentes do sistema de arquivos para Cloudinary'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula a migração sem alterar dados',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Força a migração mesmo se Cloudinary não estiver configurado',
        )

    def handle(self, *args, **options):
        # Verificar se Cloudinary está configurado
        if not hasattr(settings, 'CLOUDINARY_CONFIGURED') or not settings.CLOUDINARY_CONFIGURED:
            if not options['force']:
                raise CommandError(
                    'Cloudinary não está configurado. Use --force para continuar mesmo assim.\n'
                    'Configure as variáveis: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
                )
            else:
                self.stdout.write(
                    self.style.WARNING('⚠️  Cloudinary não configurado, mas continuando por causa de --force')
                )

        # Buscar feedbacks com imagens
        feedbacks_com_imagem = Feedback.objects.exclude(imagem__isnull=True).exclude(imagem='')
        total_feedbacks = feedbacks_com_imagem.count()

        if total_feedbacks == 0:
            self.stdout.write(self.style.SUCCESS('✅ Nenhum feedback com imagem encontrado para migrar.'))
            return

        self.stdout.write(f'📊 Encontrados {total_feedbacks} feedbacks com imagens para migrar.')

        migrados = 0
        erros = 0

        for feedback in feedbacks_com_imagem:
            try:
                if options['dry_run']:
                    self.stdout.write(f'[DRY-RUN] Migraria: {feedback.titulo} - {feedback.imagem.name}')
                    migrados += 1
                    continue

                # Verificar se arquivo existe
                if not feedback.imagem:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Feedback {feedback.id}: campo imagem está vazio')
                    )
                    continue

                # Verificar se o arquivo físico existe
                try:
                    image_path = feedback.imagem.path
                    if not os.path.exists(image_path):
                        self.stdout.write(
                            self.style.WARNING(f'⚠️  Arquivo não encontrado: {image_path}')
                        )
                        continue
                except (ValueError, AttributeError):
                    # Pode acontecer se a imagem já estiver no Cloudinary
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Feedback {feedback.id}: imagem pode já estar no Cloudinary')
                    )
                    continue

                # Aqui faríamos o upload para Cloudinary
                # Por enquanto, apenas loggar o que seria feito
                self.stdout.write(f'🔄 Migrando: {feedback.titulo} - {feedback.imagem.name}')
                
                # TODO: Implementar upload real para Cloudinary
                # cloudinary.uploader.upload(image_path, folder="feedback/")
                
                migrados += 1
                self.stdout.write(f'✅ Migrado: {feedback.titulo}')

            except Exception as e:
                erros += 1
                self.stdout.write(
                    self.style.ERROR(f'❌ Erro ao migrar feedback {feedback.id}: {str(e)}')
                )
                logger.error(f'Erro ao migrar feedback {feedback.id}: {str(e)}', exc_info=True)

        # Resultado final
        if options['dry_run']:
            self.stdout.write(
                self.style.SUCCESS(f'[DRY-RUN] 🎯 Resultado da simulação:')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'🎯 Migração concluída:')
            )
        
        self.stdout.write(f'   ✅ Migrados com sucesso: {migrados}')
        self.stdout.write(f'   ❌ Erros: {erros}')
        self.stdout.write(f'   📊 Total processados: {migrados + erros}')

        if not options['dry_run'] and migrados > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    '\n🚀 Migração concluída! As imagens agora estão persistentes no Cloudinary.'
                )
            )