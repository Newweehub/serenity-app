import { useState } from 'react';
import ChatPanel from '../components/ui/ChatPanel.jsx';
import './Mindfulness.css';

const EXERCISES = [
  {
    id: 'breathing_478',
    name: '4-7-8 Breathing',
    duration: '5 min',
    type: 'breathing',
    icon: '💨',
    description: 'Calms the nervous system. Inhale 4s, hold 7s, exhale 8s.',
    prompt: 'I would like to do the 4-7-8 breathing exercise. Please guide me through it step by step.',
  },
  {
    id: 'box_breathing',
    name: 'Box Breathing',
    duration: '4 min',
    type: 'breathing',
    icon: '⬜',
    description: 'Used by Navy SEALs for focus under pressure. 4-4-4-4.',
    prompt: 'Guide me through box breathing please.',
  },
  {
    id: 'grounding_54321',
    name: '5-4-3-2-1 Grounding',
    duration: '5 min',
    type: 'grounding',
    icon: '🌱',
    description: 'Reconnects you to the present through your five senses.',
    prompt: 'I feel disconnected. Please guide me through the 5-4-3-2-1 grounding exercise.',
  },
  {
    id: 'body_scan_5min',
    name: 'Body Scan',
    duration: '5 min',
    type: 'body scan',
    icon: '🧘',
    description: 'A gentle scan from head to toe to release tension.',
    prompt: 'Please guide me through a short 5-minute body scan meditation.',
  },
  {
    id: 'mindful_breath',
    name: 'One Mindful Breath',
    duration: '1 min',
    type: 'breathing',
    icon: '🌬',
    description: 'Just one intentional breath. Perfect when you have 60 seconds.',
    prompt: 'I only have one minute. Guide me through a single mindful breath.',
  },
  {
    id: 'gratitude_3',
    name: '3 Things Gratitude',
    duration: '3 min',
    type: 'reflection',
    icon: '✨',
    description: 'Notice three things you are grateful for right now.',
    prompt: 'Help me practise a quick gratitude exercise — three things I am grateful for.',
  },
];

const TYPES = ['all', 'breathing', 'grounding', 'body scan', 'reflection'];

export default function Mindfulness() {
  const [activeExercise, setActiveExercise] = useState(null);
  const [filter,         setFilter]         = useState('all');

  const filtered = filter === 'all'
    ? EXERCISES
    : EXERCISES.filter(e => e.type === filter);

  if (activeExercise) {
    return (
      <div className="mindfulness-session fade-up">
        <button className="back-btn" onClick={() => setActiveExercise(null)}>
          ← Back to library
        </button>
        <div className="session-header">
          <span className="session-icon">{activeExercise.icon}</span>
          <div>
            <h2 className="session-title">{activeExercise.name}</h2>
            <p className="session-duration">{activeExercise.duration}</p>
          </div>
        </div>
        <div className="session-chat">
          <ChatPanel
            initialMessage={activeExercise.prompt}
            placeholder="Tell Serenity how you feel, or ask a question…"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mindfulness-page">
      {/* Quick start / mood check */}
      <div className="mindfulness-hero fade-up">
        <div className="hero-text">
          <h2 className="hero-heading">How are you feeling?</h2>
          <p className="hero-sub">Tell Serenity and she'll suggest the right exercise for you.</p>
        </div>
        <div className="hero-chat">
          <ChatPanel placeholder="I'm feeling stressed / anxious / tired…" />
        </div>
      </div>

      {/* Library */}
      <section className="exercise-library fade-up">
        <div className="library-header">
          <h3 className="library-title">Exercise library</h3>
          <div className="filter-chips">
            {TYPES.map(t => (
              <button
                key={t}
                className={`filter-chip ${filter === t ? 'active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="exercise-grid stagger">
          {filtered.map(ex => (
            <button
              key={ex.id}
              className="exercise-card fade-up"
              onClick={() => setActiveExercise(ex)}
            >
              <div className="ex-card-top">
                <span className="ex-icon">{ex.icon}</span>
                <span className="ex-duration">{ex.duration}</span>
              </div>
              <h4 className="ex-name">{ex.name}</h4>
              <p className="ex-desc">{ex.description}</p>
              <span className="ex-type-badge">{ex.type}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
