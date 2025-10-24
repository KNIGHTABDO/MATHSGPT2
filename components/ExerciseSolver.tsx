import React, { useState, useRef } from 'react';
import { solveExercise } from '../services/geminiService';
import type { SolveResult, ChartData } from '../types';
import GraphVisualizer from './GraphVisualizer';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import { UploadIcon } from './icons/UploadIcon';
import useAudioPlayer from '../hooks/useAudioPlayer';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';

const simpleMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  // Convert Markdown bold to <strong> tags and newlines to <br> tags.
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
};

const ExerciseSolver: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isPlaying, isLoading: isAudioLoading, play, pause, setAudioText } = useAudioPlayer();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt && !image) {
      setError('Please provide a problem description or an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await solveExercise(prompt, image, useThinkingMode);
      setResult(res);
      setAudioText(res.explanation);
    } catch (e) {
      setError('An error occurred while solving the problem. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioToggle = () => {
      if (isPlaying) {
          pause();
      } else {
          play();
      }
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            rows={5}
            placeholder="Type your problem here, or upload an image..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} variant="secondary">
                 <UploadIcon />
                 {image ? 'Change Image' : 'Upload Image'}
               </Button>
               {image && <span className="text-sm text-gray-400 truncate max-w-[150px]">{image.name}</span>}
            </div>
             <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="thinking-mode"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={useThinkingMode}
                    onChange={(e) => setUseThinkingMode(e.target.checked)}
                />
                <label htmlFor="thinking-mode" className="text-sm font-medium text-gray-300">
                    Thinking Mode
                </label>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Spinner /> : 'Solve Problem'}
          </Button>
        </form>
      </Card>
      {error && <Card><p className="text-red-400">{error}</p></Card>}
      {result && (
        <Card>
            <div className="space-y-6">
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-blue-400">Solution</h3>
                    <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(result.solution) }} />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-blue-400">Key Concept</h3>
                    <p className="text-gray-300">{result.explanation}</p>
                    <Button onClick={handleAudioToggle} disabled={isAudioLoading} variant="secondary" className="mt-3">
                        {isAudioLoading ? <Spinner/> : (isPlaying ? <PauseIcon /> : <PlayIcon />)}
                        {isPlaying ? 'Pause' : 'Play Audio Explanation'}
                    </Button>
                </div>
                {result.chartData && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Visualization</h3>
                        <GraphVisualizer chartData={result.chartData} />
                    </div>
                )}
            </div>
        </Card>
      )}
    </div>
  );
};

export default ExerciseSolver;