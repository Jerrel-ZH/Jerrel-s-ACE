/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Diamond, Club, Spade, RefreshCw, Trophy, AlertCircle, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, Suit, Rank, createDeck, shuffleDeck, SUITS } from './types';

const CARD_COLORS = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-zinc-800',
  spades: 'text-zinc-800',
};

const SUIT_ICONS = {
  hearts: <Heart className="w-full h-full" />,
  diamonds: <Diamond className="w-full h-full" />,
  clubs: <Club className="w-full h-full" />,
  spades: <Spade className="w-full h-full" />,
};

export default function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentSuit, setCurrentSuit] = useState<Suit | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [gameStatus, setGameStatus] = useState<'start' | 'playing' | 'won' | 'lost'>('start');
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingAceCard, setPendingAceCard] = useState<Card | null>(null);
  const [message, setMessage] = useState<string>("Welcome to Crazy Ace!");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Initialize game
  const initGame = useCallback(() => {
    const fullDeck = shuffleDeck(createDeck());
    const pHand = fullDeck.slice(0, 10);
    const aHand = fullDeck.slice(10, 20);
    const initialDiscard = fullDeck[20];
    const remainingDeck = fullDeck.slice(21);

    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([initialDiscard]);
    setDeck(remainingDeck);
    setCurrentSuit(initialDiscard.suit);
    setTurn('player');
    setGameStatus('playing');
    setShowSuitPicker(false);
    setPendingAceCard(null);
    setMessage("Your turn! Match the suit or rank.");
    setIsAiThinking(false);
  }, []);

  const startGame = () => {
    initGame();
  };

  useEffect(() => {
    // Don't auto-init anymore, wait for start button
  }, []);

  const topDiscard = useMemo(() => discardPile[discardPile.length - 1], [discardPile]);

  const canPlay = (card: Card) => {
    if (!topDiscard) return false;
    if (card.rank === 'A') return true;
    return card.suit === currentSuit || card.rank === topDiscard.rank;
  };

  const checkGameOver = (pHand: Card[], aHand: Card[]) => {
    // Rule: First to empty hand LOSES
    if (pHand.length === 0) {
      setGameStatus('lost');
      setMessage("You cleared your hand first... You LOSE!");
      return true;
    }
    if (aHand.length === 0) {
      setGameStatus('won');
      setMessage("AI cleared its hand first... You WIN!");
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      return true;
    }
    return false;
  };

  const handlePlayerPlay = (card: Card) => {
    if (turn !== 'player' || gameStatus !== 'playing' || !canPlay(card)) return;

    if (card.rank === 'A') {
      setPendingAceCard(card);
      setShowSuitPicker(true);
      return;
    }

    const newHand = playerHand.filter(c => c.id !== card.id);
    setPlayerHand(newHand);
    setDiscardPile(prev => [...prev, card]);
    setCurrentSuit(card.suit);

    if (!checkGameOver(newHand, aiHand)) {
      setTurn('ai');
      setMessage("AI is thinking...");
    }
  };

  const handleSuitPick = (suit: Suit) => {
    if (!pendingAceCard) return;

    const newHand = playerHand.filter(c => c.id !== pendingAceCard.id);
    setPlayerHand(newHand);
    setDiscardPile(prev => [...prev, pendingAceCard]);
    setCurrentSuit(suit);
    setShowSuitPicker(false);
    setPendingAceCard(null);

    if (!checkGameOver(newHand, aiHand)) {
      setTurn('ai');
      setMessage(`You changed suit to ${suit}. AI's turn.`);
    }
  };

  const handleDraw = () => {
    if (turn !== 'player' || gameStatus !== 'playing') return;

    if (deck.length === 0) {
      setMessage("Deck is empty! Skipping turn.");
      setTurn('ai');
      return;
    }

    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];
    
    setPlayerHand(newHand);
    setDeck(newDeck);
    setMessage(`You drew a ${newCard.rank} of ${newCard.suit}.`);
    
    // In some rules, you can play immediately if you draw a playable card.
    // Here we let the player decide or just pass turn if they want.
    // For simplicity, we just add to hand and let them play if they can, or they can draw again?
    // Usually you draw once and if you can't play, turn ends.
    if (!canPlay(newCard)) {
      setTurn('ai');
    }
  };

  // AI Logic
  useEffect(() => {
    if (turn === 'ai' && gameStatus === 'playing') {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const playableCards = aiHand.filter(canPlay);
        
        if (playableCards.length > 0) {
          // AI Strategy: Play non-Ace first if possible, or play Ace if it's the only choice
          const nonAce = playableCards.find(c => c.rank !== 'A');
          const cardToPlay = nonAce || playableCards[0];

          const newAiHand = aiHand.filter(c => c.id !== cardToPlay.id);
          setAiHand(newAiHand);
          setDiscardPile(prev => [...prev, cardToPlay]);
          
          if (cardToPlay.rank === 'A') {
            // AI picks its most frequent suit
            const suitCounts: Record<string, number> = {};
            newAiHand.forEach(c => {
              suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
            });
            const bestSuit = (Object.keys(suitCounts).sort((a, b) => suitCounts[b] - suitCounts[a])[0] as Suit) || 'hearts';
            setCurrentSuit(bestSuit);
            setMessage(`AI played Ace and changed suit to ${bestSuit}!`);
          } else {
            setCurrentSuit(cardToPlay.suit);
            setMessage(`AI played ${cardToPlay.rank} of ${cardToPlay.suit}.`);
          }

          if (!checkGameOver(playerHand, newAiHand)) {
            setTurn('player');
          }
        } else {
          // AI draws
          if (deck.length > 0) {
            const newCard = deck[0];
            const newDeck = deck.slice(1);
            const newAiHand = [...aiHand, newCard];
            setAiHand(newAiHand);
            setDeck(newDeck);
            setMessage("AI had no moves and drew a card.");
            
            // If AI draws a playable card, it plays it
            if (canPlay(newCard)) {
               // Recursive-like play logic simplified
               // For now, AI just ends turn after drawing to keep it simple
               setTurn('player');
            } else {
               setTurn('player');
            }
          } else {
            setMessage("AI has no moves and deck is empty. Skipping.");
            setTurn('player');
          }
        }
        setIsAiThinking(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, aiHand, currentSuit, deck, gameStatus, playerHand, topDiscard]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Start Screen */}
      <AnimatePresence>
        {gameStatus === 'start' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1a1a1a] p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mx-auto mb-8">
                <Trophy className="text-white w-12 h-12 md:w-16 md:h-16" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent italic">
                CRAZY ACE
              </h1>
              <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-md mx-auto">
                A strategic twist on Crazy Eights. Remember: the first to empty their hand <span className="text-emerald-400 font-bold">LOSES</span>!
              </p>
              
              <button
                onClick={startGame}
                className="group relative px-12 py-5 bg-white text-zinc-900 font-bold text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-white/10"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Click to Start
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.div>
                </span>
              </button>
            </motion.div>

            {/* Background elements */}
            <div className="absolute top-1/4 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Crazy Ace</h1>
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium">First to empty hand loses</p>
          </div>
        </div>
        <button 
          onClick={initGame}
          className="p-2 hover:bg-white/5 rounded-full transition-colors group"
          title="Restart Game"
        >
          <RefreshCw className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
        </button>
      </header>

      {/* Game Board */}
      <main className="flex-1 relative p-4 md:p-8 flex flex-col items-center justify-between max-w-6xl mx-auto w-full">
        
        {/* AI Area */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full ${turn === 'ai' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-sm font-medium text-zinc-400">AI Opponent ({aiHand.length})</span>
          </div>
          <div className="flex -space-x-8 md:-space-x-12 overflow-visible py-4">
            {aiHand.map((_, idx) => (
              <motion.div
                key={`ai-card-${idx}`}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-16 h-24 md:w-24 md:h-36 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg border-2 border-white/10 shadow-xl flex items-center justify-center"
              >
                <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-white/5 rounded-full flex items-center justify-center">
                   <div className="w-4 h-4 md:w-6 md:h-6 bg-emerald-500/20 rounded-full" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center Area (Deck & Discard) */}
        <div className="flex items-center gap-8 md:gap-16 my-8">
          {/* Draw Pile */}
          <div className="relative group">
            <button 
              onClick={handleDraw}
              disabled={turn !== 'player' || gameStatus !== 'playing'}
              className="relative w-24 h-36 md:w-32 md:h-48 bg-emerald-600 rounded-xl border-4 border-white/20 shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <div className="text-white font-bold text-2xl opacity-20 select-none">DECK</div>
              <div className="absolute -bottom-2 -right-2 bg-zinc-900 px-2 py-1 rounded-md text-xs font-mono border border-white/10">
                {deck.length}
              </div>
            </button>
            {/* Stack effect */}
            <div className="absolute -z-10 top-1 left-1 w-full h-full bg-emerald-700 rounded-xl border-4 border-white/10" />
            <div className="absolute -z-20 top-2 left-2 w-full h-full bg-emerald-800 rounded-xl border-4 border-white/10" />
          </div>

          {/* Discard Pile */}
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {topDiscard && (
                <motion.div
                  key={topDiscard.id}
                  initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className="w-24 h-36 md:w-32 md:h-48 bg-white rounded-xl border-4 border-white/20 shadow-2xl flex flex-col p-3 text-zinc-900 relative"
                >
                  <div className={`text-xl md:text-2xl font-bold leading-none ${CARD_COLORS[topDiscard.suit]}`}>
                    {topDiscard.rank}
                  </div>
                  <div className={`w-4 h-4 md:w-6 md:h-6 ${CARD_COLORS[topDiscard.suit]}`}>
                    {SUIT_ICONS[topDiscard.suit]}
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 p-6">
                    {SUIT_ICONS[topDiscard.suit]}
                  </div>

                  <div className={`absolute bottom-3 right-3 text-xl md:text-2xl font-bold leading-none rotate-180 ${CARD_COLORS[topDiscard.suit]}`}>
                    {topDiscard.rank}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Current Suit Indicator (for Aces) */}
            {currentSuit && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-6 -right-6 w-12 h-12 bg-zinc-800 rounded-full border-2 border-white/20 flex items-center justify-center shadow-lg p-2"
              >
                <div className={CARD_COLORS[currentSuit]}>
                  {SUIT_ICONS[currentSuit]}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Player Area */}
        <div className="w-full flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 w-full max-w-md">
            <div className="flex-1 h-px bg-white/10" />
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className={`w-2 h-2 rounded-full ${turn === 'player' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-sm font-medium text-emerald-400">Your Hand ({playerHand.length})</span>
            </div>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-full overflow-x-auto pb-8 px-4">
            <AnimatePresence>
              {playerHand.map((card) => {
                const playable = canPlay(card) && turn === 'player' && gameStatus === 'playing';
                return (
                  <motion.button
                    key={card.id}
                    layout
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0, scale: 0.5 }}
                    whileHover={playable ? { y: -20, scale: 1.05 } : {}}
                    onClick={() => handlePlayerPlay(card)}
                    disabled={!playable}
                    className={`
                      w-16 h-24 md:w-24 md:h-36 bg-white rounded-lg border-2 shadow-xl flex flex-col p-1.5 md:p-2 text-zinc-900 relative transition-all
                      ${playable ? 'cursor-pointer border-emerald-400/50 hover:shadow-emerald-500/20' : 'opacity-60 grayscale-[0.5] border-transparent cursor-not-allowed'}
                    `}
                  >
                    <div className={`text-sm md:text-lg font-bold leading-none ${CARD_COLORS[card.suit]}`}>
                      {card.rank}
                    </div>
                    <div className={`w-3 h-3 md:w-4 md:h-4 ${CARD_COLORS[card.suit]}`}>
                      {SUIT_ICONS[card.suit]}
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 p-4">
                      {SUIT_ICONS[card.suit]}
                    </div>

                    <div className={`absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 text-sm md:text-lg font-bold leading-none rotate-180 ${CARD_COLORS[card.suit]}`}>
                      {card.rank}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Message Bar */}
      <footer className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-center gap-3">
        {isAiThinking ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
            <span className="text-sm text-zinc-400">AI is calculating its next move...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}
      </footer>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {showSuitPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Wild Ace!</h2>
              <p className="text-zinc-400 mb-8">Choose the next suit to play</p>
              
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitPick(suit)}
                    className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
                  >
                    <div className={`w-12 h-12 group-hover:scale-110 transition-transform ${CARD_COLORS[suit]}`}>
                      {SUIT_ICONS[suit]}
                    </div>
                    <span className="capitalize font-medium text-zinc-300">{suit}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameStatus !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${gameStatus === 'won' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'} shadow-lg`}>
                {gameStatus === 'won' ? <Trophy className="w-10 h-10 text-white" /> : <AlertCircle className="w-10 h-10 text-white" />}
              </div>
              
              <h2 className="text-3xl font-bold mb-2">
                {gameStatus === 'won' ? 'Victory!' : 'Defeat!'}
              </h2>
              <p className="text-zinc-400 mb-8">
                {message}
              </p>
              
              <button
                onClick={initGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
