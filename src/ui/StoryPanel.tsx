
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../engine/store';

export function StoryPanel() {
  const story = useStore(state => state.story);
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
     if (ref.current) {
         ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
     }
  }, [story.length]);

  return (
    <div className={`story-wrapper ${show ? 'visible' : 'hidden'}`}>
        {!show && (
            <div className="story-toggle" onClick={() => setShow(true)}>
                SHOW TEXT
            </div>
        )}
        {show && (
            <>
            <button className="story-close" onClick={() => setShow(false)}>
                [ HIDE ]
            </button>
            <div className="story-panel" ref={ref}>
               {story.map((item, i) => (
                  <span key={i + item.id} className={`fragment type-${item.type}`}>
                     {item.text}
                  </span>
               ))}
               <span className="cursor">_</span>
            </div>
            </>
        )}
    </div>
  );
}
