'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { generateTreeImage, GenerateTreeImageInput } from '@/ai/flows/generate-tree-image-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsClient } from '@/hooks/use-is-client';

const CORRECT_PASSWORD = '251225';

type Tree = {
  name: string;
  color: string;
  imageUrl: string | null;
};

const initialTrees: Tree[] = [
  { name: 'Science', color: 'blue', imageUrl: null },
  { name: 'Conscious', color: 'purple', imageUrl: null },
  { name: 'Soul', color: 'gold', imageUrl: null },
  { name: 'Rule', color: 'silver', imageUrl: null },
  { name: 'Hope', color: 'green', imageUrl: null },
];

function PasswordPrompt({ onPasswordCorrect }: { onPasswordCorrect: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onPasswordCorrect();
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <h1 className="text-2xl font-bold text-center text-white">Enter Password</h1>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="bg-gray-800 border-gray-600 text-white"
        />
        <Button type="submit" variant="outline">Enter</Button>
        {error && <p className="text-destructive text-center">{error}</p>}
      </form>
    </div>
  );
}

function TreePageContent() {
  const [trees, setTrees] = useState<Tree[]>(initialTrees);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTreeImages = async () => {
      const imagePromises = initialTrees.map(tree => 
        generateTreeImage({ treeType: tree.name, color: tree.color })
      );
      try {
        const results = await Promise.all(imagePromises);
        const updatedTrees = initialTrees.map((tree, index) => ({
          ...tree,
          imageUrl: results[index].imageUrl,
        }));
        setTrees(updatedTrees);
      } catch (error) {
        console.error("Failed to generate tree images:", error);
        // Handle error state if necessary
      } finally {
        setIsLoading(false);
      }
    };
    fetchTreeImages();
  }, []);

  return (
    <div className="flex flex-col h-full w-full items-center justify-between bg-black text-white p-8">
      <div className="flex-grow flex items-center justify-center w-full">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 w-full max-w-7xl">
          {trees.map((tree, index) => (
            <Card key={index} className="bg-transparent border-0 shadow-none text-center">
              <CardContent className="p-0">
                {isLoading || !tree.imageUrl ? (
                  <Skeleton className="w-full h-96 bg-gray-800" />
                ) : (
                  <Image
                    src={tree.imageUrl}
                    alt={`The Tree of ${tree.name}`}
                    width={300}
                    height={400}
                    className="object-cover w-full h-96 rounded-lg"
                     data-ai-hint={`tree ${tree.name.toLowerCase()}`}
                  />
                )}
                <h2 className="mt-4 text-xl font-bold tracking-tight">{tree.name}</h2>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="w-full max-w-2xl mt-8">
        <Input
          placeholder="Ask a question to the trees..."
          className="bg-gray-900 border-gray-700 text-lg text-center"
        />
      </div>
    </div>
  );
}


export default function TreePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isClient = useIsClient();

  // Fullscreen container
  const pageStyle: React.CSSProperties = {
      height: 'calc(100vh - 4rem)', // Adjust for header height if needed
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
  };

  if (!isClient) {
    return (
        <div style={pageStyle} className="bg-black">
            <Skeleton className="w-full h-full" />
        </div>
    )
  }

  return (
    <div style={pageStyle}>
      {!isAuthenticated ? (
        <PasswordPrompt onPasswordCorrect={() => setIsAuthenticated(true)} />
      ) : (
        <TreePageContent />
      )}
    </div>
  );
}
