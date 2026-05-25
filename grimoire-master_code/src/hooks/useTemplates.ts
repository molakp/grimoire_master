import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { CharacterTemplate } from '../types';
import { CHARACTER_TEMPLATES } from '../data';

export function useTemplates() {
  const [templates, setTemplates] = useState<CharacterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'templates'))
      .then((snap) => {
        const remote = snap.docs.map((d) => d.data() as CharacterTemplate);
        setTemplates(remote.length > 0 ? remote : CHARACTER_TEMPLATES);
      })
      .catch(() => {
        setTemplates(CHARACTER_TEMPLATES);
        setError('offline');
      })
      .finally(() => setLoading(false));
  }, []);

  return { templates, loading, error };
}
