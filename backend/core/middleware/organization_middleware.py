from core.models import OrganizationMember


class OrganizationMiddleware:
    """
    Middleware que adiciona informações da organização ativa no request.

    Adiciona ao request:
    - request.organization: Objeto Organization do usuário
    - request.organization_member: Objeto OrganizationMember
    - request.organization_role: String com o role (owner/admin/member)
    - request.has_module_access(module_key): Função para verificar acesso a módulos
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Inicializar atributos como None
        request.organization = None
        request.organization_member = None
        request.organization_role = None
        request.has_module_access = lambda module_key: False

        if request.user.is_authenticated:
            # Tentar pegar organização ativa da sessão
            org_id = request.session.get('active_organization_id')

            if org_id:
                # Buscar membership específico
                try:
                    member = OrganizationMember.objects.select_related('organization').get(
                        user=request.user,
                        organization_id=org_id,
                        ativo=True,
                        organization__ativo=True
                    )
                    self._set_organization_data(request, member)
                except OrganizationMember.DoesNotExist:
                    # Organização não encontrada ou usuário não é mais membro
                    # Limpar sessão e tentar pegar primeira organização
                    request.session.pop('active_organization_id', None)
                    self._set_first_organization(request)
            else:
                # Não tem organização na sessão, pegar primeira
                self._set_first_organization(request)

        response = self.get_response(request)
        return response

    def _set_first_organization(self, request):
        """Define a primeira organização do usuário como ativa"""
        member = OrganizationMember.objects.select_related('organization').filter(
            user=request.user,
            ativo=True,
            organization__ativo=True
        ).first()

        if member:
            request.session['active_organization_id'] = member.organization.id
            self._set_organization_data(request, member)

    def _set_organization_data(self, request, member):
        """Define os dados da organização no request"""
        request.organization = member.organization
        request.organization_member = member
        request.organization_role = member.role

        # CACHE de permissões para evitar N+1 queries
        if member.role == 'member':
            # Fazer apenas 1 query para pegar todas as permissões
            permissoes_cache = set(
                member.permissoes_modulos
                .filter(ativo=True)
                .values_list('module_key', flat=True)
            )
        else:
            # Owner e Admin não precisam de cache (acesso total)
            permissoes_cache = None

        # Criar função helper para verificar acesso a módulos
        def has_module_access(module_key):
            """
            Verifica se o usuário tem acesso a um módulo específico
            Owner e Admin têm acesso a tudo
            Member precisa ter permissão explícita

            OTIMIZADO: Usa cache de permissões para evitar N+1 queries
            """
            if member.role in ['owner', 'admin']:
                return True

            # Member: verificar no cache (sem query adicional)
            return module_key in permissoes_cache if permissoes_cache else False

        request.has_module_access = has_module_access
