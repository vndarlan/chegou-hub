import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { HelpCircle } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-foreground hover:text-foreground"
          title="Enviar Feedback"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
        </DialogHeader>
        <FeedbackModal onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackButton;