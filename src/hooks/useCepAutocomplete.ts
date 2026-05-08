import { useState, useCallback } from 'react';
import { buscarCep } from '../services/cepService';

interface UseCepAutocompleteReturn {
  loading: boolean;
  error: string | null;
  handleCepChange: (cep: string) => Promise<{
    logradouro?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
  } | null>;
}

export const useCepAutocomplete = (): UseCepAutocompleteReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCepChange = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await buscarCep(cep);

      if (!data) {
        setError('CEP não encontrado');
        return null;
      }

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        municipio: data.localidade,
        uf: data.uf,
      };
    } catch (err) {
      setError('Erro ao buscar CEP');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    handleCepChange,
  };
};
