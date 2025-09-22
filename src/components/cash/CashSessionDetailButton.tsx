import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { CashSessionDetailModal } from './CashSessionDetailModal';

interface CashSessionDetailButtonProps {
  sessionId: string;
  sessionData?: any;
}

export function CashSessionDetailButton({ sessionId, sessionData }: CashSessionDetailButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
        <Eye className="w-4 h-4" />
      </Button>
      
      <CashSessionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionId={sessionId}
        sessionData={sessionData}
      />
    </>
  );
}