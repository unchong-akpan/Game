import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';

// Types
interface Player {
  id: string;
  name: string;
  score: number;
  attempts: number;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  type: 'player' | 'self' | 'system';
}

const SOCKET_URL = '';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gmId, setGmId] = useState('');
  const [gameState, setGameState] = useState<'waiting' | 'started' | 'ended'>('waiting');
  const [question, setQuestion] = useState('');
  const [timer, setTimer] = useState(60);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [isWinner, setIsWinner] = useState(false);
  const [activeAnswer, setActiveAnswer] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');

  // GM Specific
  const [gmQuestion, setGmQuestion] = useState('');
  const [gmAnswer, setGmAnswer] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('player-update', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    newSocket.on('gm-update', (id: string) => {
      setGmId(id);
    });

    newSocket.on('question-ready', ({ question }: { question: string }) => {
      setQuestion(question);
      addMessage('System', `Game Master has set the question: ${question}`, 'system');
    });

    newSocket.on('game-started', ({ question }: { question: string }) => {
      setGameState('started');
      setQuestion(question);
      setMessages([]); // Clear chat for new round
      addMessage('System', 'The game has started!', 'system');
      setIsWinner(false);
      setActiveAnswer(''); // Reset for players
    });

    newSocket.on('gm-answer', ({ answer }: { answer: string }) => {
      setActiveAnswer(answer);
    });

    newSocket.on('timer-update', (timeLeft: number) => {
      setTimer(timeLeft);
    });

    newSocket.on('game-ended', ({ winnerId, winnerName, answer, players }: { winnerId: string | null, winnerName: string | null, answer: string, players: Player[] }) => {
      setGameState('ended');
      setPlayers(players);
      setLastAnswer(answer);
      if (winnerId) {
        addMessage('System', `Game Over! ${winnerName} won with the answer: ${answer}`, 'system');
        if (winnerId === newSocket.id) setIsWinner(true);
      } else {
        addMessage('System', `Time's up! No winner. The answer was: ${answer}`, 'system');
      }
      setTimeout(() => {
        setGameState('waiting');
        setQuestion('');
        setIsWinner(false);
        setLastAnswer('');
      }, 5000);
    });

    newSocket.on('wrong-answer', ({ attemptsLeft }: { attemptsLeft: number }) => {
      addMessage('System', `Wrong answer! You have ${attemptsLeft} attempts left.`, 'system');
    });

    newSocket.on('out-of-attempts', () => {
      addMessage('System', 'You are out of attempts for this round!', 'system');
    });

    newSocket.on('error-msg', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (sender: string, text: string, type: 'player' | 'self' | 'system') => {
    setMessages(prev => [...prev, { id: Math.random().toString(), text, sender, type }]);
  };

  const joinRoom = () => {
    if (socket && roomId && playerName) {
      socket.emit('join-room', { roomId, playerName });
      setInRoom(true);
    }
  };

  const startGame = () => {
    if (socket && inRoom) {
      socket.emit('start-game', { roomId });
    }
  };

  const setQuestionAndAnswer = () => {
    if (socket && inRoom && gmQuestion && gmAnswer) {
      socket.emit('set-question', { roomId, question: gmQuestion, answer: gmAnswer });
      setGmQuestion('');
      setGmAnswer('');
    }
  };

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && guess && gameState === 'started') {
      socket.emit('submit-guess', { roomId, guess });
      addMessage('You', guess, 'self');
      setGuess('');
    }
  };

  const isGM = socket?.id === gmId;

  if (!inRoom) {
    return (
      <div className="app-container">
        <div className="glass-card lobby-container fade-in">
          <h1 className="lobby-title">Guessing Game</h1>
          <div className="input-group">
            <input 
              placeholder="Enter Room ID" 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)} 
            />
            <input 
              placeholder="Your Name" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)} 
            />
            <button onClick={joinRoom} disabled={!roomId || !playerName}>
              Join Session
            </button>
            {error && <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="glass-card game-layout fade-in">
        <div className="main-area">
          <header className="header">
            <div>
              <h2>Room: {roomId}</h2>
              <p className="text-muted">Role: {isGM ? 'Game Master' : 'Player'}</p>
            </div>
            <div className={`timer ${timer < 10 ? 'low' : ''}`}>
              {timer}s
            </div>
          </header>

          {isGM && gameState === 'waiting' && (
            <div className="gm-panel">
              <h3>Set Question for Players</h3>
              <div className="input-group" style={{ marginTop: '1rem', maxWidth: 'none' }}>
                <input 
                  placeholder="The Question (e.g. What is the capital of France?)" 
                  value={gmQuestion}
                  onChange={e => setGmQuestion(e.target.value)}
                />
                <input 
                  placeholder="The Answer" 
                  value={gmAnswer}
                  onChange={e => setGmAnswer(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={setQuestionAndAnswer} style={{ flex: 1 }}>Set Question</button>
                  <button onClick={startGame} style={{ flex: 1, background: 'var(--accent)' }}>Start Game</button>
                </div>
              </div>
            </div>
          )}

          {gameState === 'started' && (
            <div className="question-display">
              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>QUESTION</p>
              <strong>{question}</strong>
              {isGM && activeAnswer && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>ANSWER (GM ONLY)</p>
                  <strong style={{ color: 'var(--accent)' }}>{activeAnswer}</strong>
                </div>
              )}
            </div>
          )}

          {gameState === 'waiting' && !isGM && (
            <div className="question-display">
              <strong>Waiting for Game Master to start...</strong>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {players.length} players connected. Need 3 to start.
              </p>
            </div>
          )}

          {gameState === 'ended' && (
            <div className="question-display" style={{ background: isWinner ? 'var(--accent)' : 'var(--card-bg)' }}>
              <strong>{isWinner ? 'YOU WON! 🎉' : 'Round Over'}</strong>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.2rem' }}>CORRECT ANSWER</p>
                <strong style={{ fontSize: '1.5rem' }}>{lastAnswer}</strong>
              </div>
            </div>
          )}

          <div className="chat-container">
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.type}`}>
                  {msg.type !== 'system' && <strong>{msg.sender}: </strong>}
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {!isGM && gameState === 'started' && (
              <form className="chat-input-area" onSubmit={submitGuess}>
                <input 
                  placeholder="Type your guess..." 
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit">Guess</button>
              </form>
            )}
          </div>
        </div>

        <aside className="sidebar">
          <h3>Players</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map(p => (
              <div key={p.id} className="player-item">
                <div className="player-info">
                  <div className="status-dot"></div>
                  <span>{p.name} {p.id === socket?.id && '(You)'}</span>
                  {p.id === gmId && <span className="gm-badge">GM</span>}
                </div>
                <div>
                  <strong>{p.score}</strong>
                </div>
              </div>
            ))}
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
        </aside>
      </div>
    </div>
  );
}

export default App;
