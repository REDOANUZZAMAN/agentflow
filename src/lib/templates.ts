import type { ComponentType } from 'react';
import {
  ShoppingBag, Moon, Plane, ChefHat, Building2, Quote, Sun, Ghost, Shirt, Dumbbell, UtensilsCrossed,
  Landmark, Rocket, Sparkles, Palette, LayoutGrid, Mic, BookOpen, Laugh, Newspaper, AtSign, Search,
} from 'lucide-react';

export type TemplateCategory = 'video' | 'images' | 'voice' | 'automation';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  prompt: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;   // icon colour + tile background
  estimate?: string; // rough fal.ai cost of one run
  comingSoon?: boolean; // needs nodes that don't run yet (email, web, social posting)
}

// Video templates follow the pipeline the builder agent knows: elements → photo → video + voiceover per shot → final video
export const TEMPLATES: Template[] = [
  // ─── Video ───────────────────────────────────────────────────────
  { id: 'product-ad', name: 'Product ad', category: 'video', icon: ShoppingBag, tint: 'text-violet-300 bg-violet-500/10 ring-violet-500/25', estimate: '~$3',
    prompt: 'Create a 3-shot, 15-second product ad video for premium wireless earbuds. Use one product element so the earbuds look the same in every shot, cinematic studio lighting, and an energetic English voiceover for each shot. Compile everything into a final video.' },
  { id: 'bedtime-story', name: 'Bedtime story', category: 'video', icon: Moon, tint: 'text-indigo-300 bg-indigo-500/10 ring-indigo-500/25', estimate: '~$4',
    prompt: 'Make a 4-shot animated bedtime story video for kids about a little fox who finds a lost star. Use a character element for the fox so it stays consistent, soft pastel storybook style, and a gentle calm narrator voiceover for each shot. Compile into a final video.' },
  { id: 'travel-promo', name: 'Travel promo', category: 'video', icon: Plane, tint: 'text-sky-300 bg-sky-500/10 ring-sky-500/25', estimate: '~$4',
    prompt: "Create a 4-shot travel promo video for Cox's Bazar, Bangladesh: sunrise over the longest sea beach, fishing boats, Himchari waterfall, and a sunset walk. Bright cinematic drone-style shots with an inspiring voiceover for each shot. Compile into a final video." },
  { id: 'recipe-short', name: 'Recipe short', category: 'video', icon: ChefHat, tint: 'text-amber-300 bg-amber-500/10 ring-amber-500/25', estimate: '~$3',
    prompt: 'Make a 3-shot recipe short video showing how to make chicken biryani: frying the spices, layering the rice, and the finished plate with steam rising. Close-up food photography style, warm kitchen light, and a friendly voiceover explaining each step. Compile into a final video.' },
  { id: 'property-tour', name: 'Property tour', category: 'video', icon: Building2, tint: 'text-teal-300 bg-teal-500/10 ring-teal-500/25', estimate: '~$4',
    prompt: 'Create a 4-shot real estate tour video of a modern 3-bedroom apartment: the entrance, the bright living room, the kitchen, and the balcony view at golden hour. Smooth slow camera moves and a professional, calm voiceover for each shot. Compile into a final video.' },
  { id: 'motivation-reel', name: 'Motivation reel', category: 'video', icon: Quote, tint: 'text-orange-300 bg-orange-500/10 ring-orange-500/25', estimate: '~$3',
    prompt: 'Make a 3-shot motivational reel: a runner at dawn, a student studying late at night, and someone reaching a mountain top. Dramatic cinematic lighting and a powerful deep-voice motivational line for each shot. Compile into a final video.' },
  { id: 'explainer', name: 'Science explainer', category: 'video', icon: Sun, tint: 'text-yellow-300 bg-yellow-500/10 ring-yellow-500/25', estimate: '~$4',
    prompt: 'Create a 4-shot explainer video about how solar panels make electricity: sunlight hitting the panel, electrons moving in the cells, the inverter, and a home lit up at night. Clean 3D infographic style and a clear, simple teacher voiceover for each shot. Compile into a final video.' },
  { id: 'horror-teaser', name: 'Horror teaser', category: 'video', icon: Ghost, tint: 'text-red-300 bg-red-500/10 ring-red-500/25', estimate: '~$3',
    prompt: 'Make a 3-shot horror movie teaser: an old abandoned village house at night, a flickering lantern in a dark hallway, and a shadow at the window. Dark, foggy, suspenseful style with a slow, whispering narrator voiceover for each shot. Compile into a final video.' },
  { id: 'fashion-lookbook', name: 'Fashion lookbook', category: 'video', icon: Shirt, tint: 'text-pink-300 bg-pink-500/10 ring-pink-500/25', estimate: '~$3',
    prompt: 'Create a 3-shot fashion lookbook video for a summer cotton collection with the same model in every shot (use a character element): city street, rooftop, and beach. Editorial magazine style with a stylish voiceover for each shot. Compile into a final video.' },
  { id: 'gym-promo', name: 'Gym promo', category: 'video', icon: Dumbbell, tint: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/25', estimate: '~$3',
    prompt: 'Make a 3-shot promo video for a modern gym: heavy lifting, a group cardio class, and a smiling member after training. High-energy, high-contrast lighting with a pumped-up coach voiceover for each shot. Compile into a final video.' },
  { id: 'restaurant-promo', name: 'Restaurant promo', category: 'video', icon: UtensilsCrossed, tint: 'text-rose-300 bg-rose-500/10 ring-rose-500/25', estimate: '~$3',
    prompt: 'Create a 3-shot promo video for a cozy rooftop restaurant: the chef plating a dish, friends laughing at a candle-lit table, and the city lights at night. Warm, inviting style with a welcoming voiceover for each shot. Compile into a final video.' },
  { id: 'history-doc', name: 'History documentary', category: 'video', icon: Landmark, tint: 'text-stone-300 bg-stone-500/10 ring-stone-500/25', estimate: '~$4',
    prompt: 'Make a 4-shot mini documentary about the ancient city of Mahasthangarh in Bangladesh: the old fortress walls, a busy market in ancient times, archaeologists digging, and the ruins today. Realistic documentary style with a serious narrator voiceover for each shot. Compile into a final video.' },
  { id: 'scifi-trailer', name: 'Sci-fi trailer', category: 'video', icon: Rocket, tint: 'text-cyan-300 bg-cyan-500/10 ring-cyan-500/25', estimate: '~$3',
    prompt: 'Create a 3-shot sci-fi movie trailer about the first human city on Mars: a rocket landing, a glass-dome city, and an astronaut looking at Earth in the sky. Epic cinematic style with a dramatic trailer-voice narrator for each shot. Compile into a final video.' },
  { id: 'eid-greeting', name: 'Eid greeting', category: 'video', icon: Sparkles, tint: 'text-lime-300 bg-lime-500/10 ring-lime-500/25', estimate: '~$3',
    prompt: 'Make a 3-shot Eid Mubarak greeting video: the crescent moon over a mosque, a family sharing sweets, and colorful lanterns at night. Warm festive style with a joyful voiceover wishing Eid Mubarak for each shot. Compile into a final video.' },

  // ─── Images ──────────────────────────────────────────────────────
  { id: 'character-sheet', name: 'Character design', category: 'images', icon: Palette, tint: 'text-fuchsia-300 bg-fuchsia-500/10 ring-fuchsia-500/25', estimate: '~$0.20',
    prompt: 'Images only, no video and no voiceover: design one original character (a young explorer girl with a red scarf) as a character element, then make 4 photos of her in different poses and places — front view, side view, running in a forest, and sitting by a campfire — all looking like the same character.' },
  { id: 'social-posts', name: 'Social media posts', category: 'images', icon: LayoutGrid, tint: 'text-blue-300 bg-blue-500/10 ring-blue-500/25', estimate: '~$0.20',
    prompt: 'Images only, no video and no voiceover: create 4 eye-catching square social media post images for a coffee shop launch — the shop front, a latte with heart art, a cozy reading corner, and a "Grand Opening" poster with clear readable text.' },
  { id: 'storyboard', name: 'Storyboard', category: 'images', icon: BookOpen, tint: 'text-purple-300 bg-purple-500/10 ring-purple-500/25', estimate: '~$0.30',
    prompt: 'Images only, no video and no voiceover: make a 6-frame storyboard for a short film about a boy who repairs an old robot. Use a character element for the boy and one for the robot so they stay consistent, comic-book sketch style.' },

  // ─── Voice ───────────────────────────────────────────────────────
  { id: 'podcast-intro', name: 'Podcast intro', category: 'voice', icon: Mic, tint: 'text-sky-300 bg-sky-500/10 ring-sky-500/25', estimate: '~$0.05',
    prompt: 'Voice only, no images and no video: create a 15-second podcast intro voiceover for a tech podcast called "Future Bytes" — warm, confident host voice welcoming listeners and teasing today\'s topic about AI agents.' },
  { id: 'audiobook', name: 'Audiobook narration', category: 'voice', icon: BookOpen, tint: 'text-amber-300 bg-amber-500/10 ring-amber-500/25', estimate: '~$0.10',
    prompt: 'Voice only, no images and no video: narrate the opening of a short story in 3 voiceover parts, about a lighthouse keeper who receives a letter from the sea. Calm, expressive storyteller voice.' },

  // ─── Automation (needs nodes that are not implemented yet) ───────
  { id: 'daily-joke', name: 'Daily joke by email', category: 'automation', icon: Laugh, tint: 'text-amber-300 bg-amber-500/10 ring-amber-500/25', comingSoon: true,
    prompt: 'Make me an agent that sends me a funny joke by email every morning' },
  { id: 'news-summary', name: 'News summary', category: 'automation', icon: Newspaper, tint: 'text-blue-300 bg-blue-500/10 ring-blue-500/25', comingSoon: true,
    prompt: 'Build an agent that writes a daily news summary and emails it to me' },
  { id: 'auto-post-x', name: 'Auto-post to X', category: 'automation', icon: AtSign, tint: 'text-sky-300 bg-sky-500/10 ring-sky-500/25', comingSoon: true,
    prompt: 'Create an agent that generates engaging tweets and posts them to X daily' },
  { id: 'web-monitor', name: 'Web monitor', category: 'automation', icon: Search, tint: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/25', comingSoon: true,
    prompt: 'Build an agent that monitors a webpage for changes and alerts me' },
];

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Video' },
  { id: 'images', label: 'Images' },
  { id: 'voice', label: 'Voice' },
  { id: 'automation', label: 'Automation' },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
