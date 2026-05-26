import React, { useState, useEffect } from 'react';
import { X, Loader2, ScanLine } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PedidoModal({ isOpen, onClose, onSuccess, session }: Omit<ModalProps, 'title' | 'children'> & { onSuccess?: () => void, session?: Session | null }) {
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!produto || quantidade <= 0) {
      setErrorMsg('Preencha os campos obrigatórios corretamente.');
      return;
    }
    
    setLoading(true);
    try {
      let profile_id = session?.user?.id;
      if (!profile_id) {
        const { data: userData } = await supabase.auth.getUser();
        profile_id = userData?.user?.id;
      }
      if (!profile_id) throw new Error('Usuário não autenticado');

      if (profile_id.startsWith('00000000')) {
        setTimeout(() => {
          setProduto('');
          setQuantidade(1);
          setTotal(0);
          if (onSuccess) onSuccess();
          onClose();
          alert('Modo demonstração: Pedido registrado localmente.');
        }, 600);
        return;
      }

      const { error } = await supabase.from('pedidos').insert([
        {
          profile_id: profile_id,
          produto,
          quantidade,
          total,
          status: 'Pendente'
        }
      ]);

      if (error) throw error;

      alert('Pedido criado com sucesso!');
      setProduto('');
      setQuantidade(1);
      setTotal(0);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar pedido:', error);
      setErrorMsg(`Erro: ${error.message || 'Falha ao criar o pedido.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo pedido">
      <div className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Produto</label>
          <input 
            type="text" 
            value={produto}
            onChange={e => setProduto(e.target.value)}
            placeholder="Motor W22 5cv"
            className="w-full px-3 py-2 border border-[#009DE0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#009DE0]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
            <input 
              type="number" 
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              min={1}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total (R$)</label>
            <input 
              type="number" 
              value={total}
              onChange={e => setTotal(Number(e.target.value))}
              min={0}
              step={0.01}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0]"
            />
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="px-4 py-2 bg-[#009DE0] text-white rounded-lg hover:bg-[#0085C0] transition-colors font-medium text-sm flex items-center justify-center min-w-[120px]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Criar pedido'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ChamadoModal({ isOpen, onClose, onSuccess, session }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void, session?: Session | null }) {
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('Média');
  const [equipamento, setEquipamento] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!titulo || !descricao) {
      setErrorMsg('Preencha os campos obrigatórios (assunto e descrição).');
      return;
    }
    
    setLoading(true);
    try {
      let profile_id = session?.user?.id;
      if (!profile_id) {
        const { data: userData } = await supabase.auth.getUser();
        profile_id = userData?.user?.id;
      }
      if (!profile_id) throw new Error('Usuário não autenticado');

      if (profile_id.startsWith('00000000')) {
        setTimeout(() => {
          setTitulo('');
          setDescricao('');
          setEquipamento('');
          setPrioridade('Média');
          onSuccess?.();
          onClose();
          alert('Modo demonstração: Chamado registrado localmente.');
        }, 600);
        return;
      }

      const { error } = await supabase.from('chamados').insert([
        {
          profile_id: profile_id,
          titulo,
          descricao,
          prioridade,
          equipamento: equipamento || null
        }
      ]);

      if (error) throw error;
      
      setTitulo('');
      setDescricao('');
      setEquipamento('');
      setPrioridade('Média');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Erro ao abrir chamado: ${e.message || 'Verifique o console para mais detalhes.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Abrir chamado">
      <div className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Assunto *</label>
          <input 
            type="text" 
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
          <textarea 
            rows={4}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] resize-none"
          ></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
            <select 
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] bg-white appearance-none"
            >
              <option>Baixa</option>
              <option>Média</option>
              <option>Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Máquina (opcional)</label>
            <select 
              value={equipamento}
              onChange={(e) => setEquipamento(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] bg-white appearance-none text-slate-700"
            >
              <option value="">— Sem máquina —</option>
              <option value="Torno CNC Romi GL-240">Torno CNC Romi GL-240</option>
              <option value="Fresadora Diplomat 3001">Fresadora Diplomat 3001</option>
              <option value="Solda MIG Esab Smashweld">Solda MIG Esab Smashweld</option>
            </select>
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <button 
            disabled={loading}
            onClick={handleSubmit} 
            className="px-4 py-2 bg-[#009DE0] text-white rounded-lg hover:bg-[#0085C0] transition-colors font-medium text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Abrir chamado
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function EPIModal({ isOpen, onClose, onSuccess, session }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void, session?: Session | null }) {
  const [loading, setLoading] = useState(false);
  const [equipamento, setEquipamento] = useState('Botina de Segurança');
  const [tamanho, setTamanho] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!equipamento || !motivo) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }
    
    setLoading(true);
    try {
      let profile_id = session?.user?.id;
      if (!profile_id) {
        const { data: userData } = await supabase.auth.getUser();
        profile_id = userData?.user?.id;
      }
      if (!profile_id) throw new Error('Usuário não autenticado');

      if (profile_id.startsWith('00000000')) {
        setTimeout(() => {
          setEquipamento('Botina de Segurança');
          setTamanho('');
          setMotivo('');
          onSuccess?.();
          onClose();
          alert('Modo demonstração: EPI solicitado localmente.');
        }, 600);
        return;
      }

      const { error } = await supabase.from('epis').insert([
        {
          profile_id: profile_id,
          equipamento,
          tamanho,
          motivo,
        }
      ]);

      if (error) throw error;
      
      setEquipamento('Botina de Segurança');
      setTamanho('');
      setMotivo('');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Erro ao solicitar EPI: ${e.message || 'Verifique o console para mais detalhes.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova solicitação de EPI">
      <div className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de EPI *</label>
          <select 
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] bg-white appearance-none"
          >
            <option>Botina de Segurança</option>
            <option>Protetor Auricular</option>
            <option>Óculos de proteção</option>
            <option>Luvas de raspa</option>
            <option>Avental</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tamanho</label>
            <input 
              type="text" 
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
              placeholder="M, 42..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
          <textarea 
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Desgaste, novo funcionário..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] resize-none"
          ></textarea>
        </div>
        <div className="pt-2 flex justify-end">
          <button 
            disabled={loading}
            onClick={handleSubmit} 
            className="px-5 py-2 bg-[#0a1220] text-white rounded-lg hover:bg-[#15233b] transition-colors font-medium text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Enviar solicitação
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DenunciaModal({ isOpen, onClose, onSuccess, session }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void, session?: Session | null }) {
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Conduta inadequada');
  const [descricao, setDescricao] = useState('');
  const [anonima, setAnonima] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!titulo || !descricao) {
      setErrorMsg('Preencha o título e a descrição.');
      return;
    }
    
    setLoading(true);
    try {
      let profile_id = session?.user?.id;
      if (!profile_id) {
        const { data: userData } = await supabase.auth.getUser();
        profile_id = userData?.user?.id;
      }
      
      if (!profile_id) throw new Error('Usuário não autenticado');

      if (profile_id.startsWith('00000000')) {
        setTimeout(() => {
          setTitulo('');
          setCategoria('Conduta inadequada');
          setDescricao('');
          setAnonima(true);
          onSuccess?.();
          onClose();
        }, 800);
        return;
      }

      const autor_id = profile_id;

      const response = await fetch('/api/denuncia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          titulo, 
          categoria, 
          descricao, 
          anonima, 
          autor_id 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao comunicar com o servidor e salvar denúncia.');
      }
      
      setTitulo('');
      setCategoria('Conduta inadequada');
      setDescricao('');
      setAnonima(true);
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Erro ao registrar denúncia: ${e.message || 'Verifique o console para mais detalhes.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Canal de denúncias">
      <div className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}
        <p className="text-xs text-slate-500 mb-2">Relatos enviados aqui podem ser mantidos em modo sigiloso. Detalhe o ocorrido para que seja devidamente apurado.</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
          <input 
            type="text" 
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
          <select 
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] bg-white appearance-none"
          >
            <option>Conduta inadequada</option>
            <option>Assédio / Bullying</option>
            <option>Segurança no Trabalho</option>
            <option>Fraude / Irregularidade</option>
            <option>Outro</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do ocorrido *</label>
          <textarea 
            rows={5}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva com o máximo de detalhes possível."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#009DE0] resize-none"
          ></textarea>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <input 
            type="checkbox" 
            id="anonima"
            checked={anonima}
            onChange={(e) => setAnonima(e.target.checked)}
            className="w-4 h-4 text-[#009DE0] rounded border-slate-300 focus:ring-[#009DE0]"
          />
          <label htmlFor="anonima" className="text-sm font-medium text-slate-700 cursor-pointer">
            Garantir anonimato local
          </label>
        </div>
        
        <div className="pt-2 flex justify-end">
          <button 
            disabled={loading}
            onClick={handleSubmit} 
            className="px-5 py-2 bg-[#0a1220] text-white rounded-lg hover:bg-[#15233b] transition-colors font-medium text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Enviar Denúncia
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function RFIDModal({ isOpen, onClose, onSuccess, epiId }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void, epiId: string }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimularRetirada = async () => {
    if (!epiId) return;
    setLoading(true);
    try {
      if (epiId.startsWith('mock_') || epiId.startsWith('00000000')) {
        setTimeout(() => {
          onSuccess?.();
          onClose();
          alert('Modo demonstração: EPI retirado via RFID simulado.');
        }, 1000);
        return;
      }

      const res = await fetch(`/api/epis/${epiId}/retirar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cracha: 'WOKWI-SIMULATOR' })
      });
      if (!res.ok) throw new Error('Falha na API de retirada');
      
      onSuccess?.();
      onClose();
    } catch(e) {
      console.error(e);
      alert('Erro ao simular a leitura RFID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leitor RFID Ativo">
      <div className="flex flex-col items-center justify-center space-y-6 py-4">
        
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center relative z-10">
            <ScanLine size={40} className="text-blue-500 animate-pulse" />
          </div>
          <div className="absolute inset-0 border-[3px] border-blue-400 rounded-full animate-ping opacity-20"></div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-[#0a1220]">Aproxime seu crachá</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
            A integração hardware exigirá a leitura física da sua tag NFC/RFID pelo sensor MFRC522 do almoxarifado.
          </p>
        </div>

        <div className="w-full h-px bg-slate-100 my-4"></div>
        
        <div className="w-full text-center">
          <p className="text-xs text-slate-400 mb-3">Para testar sem o Wokwi físico:</p>
          <button 
            disabled={loading}
            onClick={handleSimularRetirada}
            className="w-full border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-slate-700 font-medium text-sm flex items-center justify-center transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Simular Leitura e Retirar (Bypass)'}
          </button>
        </div>

      </div>
    </Modal>
  );
}
