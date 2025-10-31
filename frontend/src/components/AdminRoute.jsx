import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Componente de proteção de rotas para páginas administrativas.
 * Verifica se o usuário tem permissões de admin (is_staff ou is_superuser).
 *
 * Uso:
 * <Route path="/admin-page" element={<AdminRoute><AdminPage /></AdminRoute>} />
 */
const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null); // null = carregando
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get('/current-state/', {
          withCredentials: true
        });

        if (response.data.logged_in && response.data.is_admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Mostra loading enquanto verifica permissões
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não é admin, redireciona para a agenda
  if (!isAdmin) {
    return <Navigate to="/workspace/agenda" replace />;
  }

  // Se é admin, renderiza o conteúdo
  return children;
};

export default AdminRoute;
