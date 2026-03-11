import React, { useState, useRef } from 'react'
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { generateInfluencerImage } from '../services/geminiService'
import { ImageSize, AspectRatio, ENGINE_METADATA } from '../types'
import type { InfluencerParams } from '../types'

// Render styles — strong prompts to enforce artistic style
const renderStyles = [
  { id:'photorealistic', label:'Photorealistic', icon:'📷', desc:'Human-like, studio photography',
    prompt:'Ultra-realistic photographic portrait, DSLR quality, natural skin texture, photorealistic lighting, 8K photograph of',
    scenario:'Professional photography studio with soft key light and fill light, clean neutral background, shot on Canon EOS R5 85mm f/1.4',
    bg:'linear-gradient(135deg, #f0b86020, #d4956b10)' },
  { id:'anime', label:'Anime / Manga', icon:'🎨', desc:'Japanese animation style',
    prompt:'Anime art style, cel-shaded, Japanese manga illustration, vibrant colors, clean lineart, anime eyes, 2D drawn character in the style of Studio Ghibli and Makoto Shinkai,',
    scenario:'Anime background, soft pastel sky with cherry blossoms, drawn in anime art style, NOT a photograph, NOT photorealistic, 2D illustration',
    bg:'linear-gradient(135deg, #e8749a15, #9a90c415)' },
  { id:'3d-render', label:'3D Render', icon:'🖥️', desc:'CGI, Pixar-like, game character',
    prompt:'3D CGI render, Pixar-quality character, Blender/Unreal Engine style, subsurface scattering, smooth 3D modeled character,',
    scenario:'3D rendered environment with volumetric lighting, CGI studio backdrop, rendered in Octane/Unreal Engine 5',
    bg:'linear-gradient(135deg, #4858e015, #50d8a010)' },
  { id:'illustration', label:'Illustration', icon:'✍️', desc:'Digital art, concept art',
    prompt:'Digital illustration, concept art style, painterly brushstrokes, artstation trending, detailed digital painting of',
    scenario:'Fantasy concept art environment, painted background with atmospheric perspective, digital art style',
    bg:'linear-gradient(135deg, #f0b86015, #e8725c10)' },
  { id:'stylized', label:'Stylized', icon:'✨', desc:'Semi-realistic, Arcane / Spider-Verse',
    prompt:'Stylized semi-realistic art in the style of Arcane/Spider-Verse, cel-shaded with painterly details, dramatic lighting, stylized proportions,',
    scenario:'Stylized cinematic environment like Arcane or Into the Spider-Verse, dramatic moody lighting with color grading, NOT photorealistic',
    bg:'linear-gradient(135deg, #d048b015, #f0684815)' },
  { id:'pixel-art', label:'Pixel Art', icon:'🟨', desc:'Retro 8-bit / 16-bit',
    prompt:'Pixel art style, retro 16-bit video game character sprite, limited color palette, visible pixels, NO anti-aliasing, pixel art character,',
    scenario:'Retro pixel art background, 16-bit video game environment, pixelated style throughout, NOT smooth, NOT photorealistic',
    bg:'linear-gradient(135deg, #50d8a015, #4858e010)' },
]

// Human skin tones
const skinTonesHuman = ['#FCDEC0','#E8B896','#D4956B','#A0704E','#6B4226','#3D2314']
// Fantasy skin tones
const skinTonesFantasy = [
  { c:'#F5F0EB', label:'Porcelain' },
  { c:'#C0C0C0', label:'Silver' },
  { c:'#A8C8E8', label:'Pale Blue' },
  { c:'#50C878', label:'Emerald' },
  { c:'#B8A0D0', label:'Lavender' },
  { c:'#1A1A2E', label:'Obsidian' },
  { c:'#D4A847', label:'Golden' },
]
const allSkinTones = [...skinTonesHuman, ...skinTonesFantasy.map(s => s.c)]

// Eye colors
const eyeColorsNatural = ['#4A90D9','#2ECC71','#8E44AD','#A0704E','#1A1A1A','#C0392B']
const eyeColorsFantasy = [
  { c:'#CC2020', label:'Red' },
  { c:'#D4A017', label:'Gold' },
  { c:'#E0DFE0', label:'Silver' },
  { c:'#E8749A', label:'Pink' },
  { c:'#00E5FF', label:'Cyan' },
]
const allEyeColors = [...eyeColorsNatural, ...eyeColorsFantasy.map(e => e.c)]

// Hair colors
const hairColorsNatural = ['#1A1A1A','#4A3728','#C4883A','#E84C4C','#E8725C','#F0DCC0','#7A8BA5','#C9A55C']
const hairColorsFantasy = [
  { c:'#FF69B4', label:'Neon Pink' },
  { c:'#00BFFF', label:'Electric Blue' },
  { c:'#F0F0F0', label:'White' },
  { c:'#98FFB3', label:'Mint' },
  { c:'#9B59B6', label:'Purple' },
  { c:'#C4C4CC', label:'Silver' },
  { c:'#FF3300', label:'Fire Red' },
]
const allHairColors = [...hairColorsNatural, ...hairColorsFantasy.map(h => h.c)]

const faceShapes = ['Oval','Round','Angular','Heart','Square','Diamond','Long','Wide']
const hairStyles = ['Long Straight','Wavy','Curly','Pixie','Bob','Braids','Afro','Buzz Cut','Bald','Mohawk','Twin Tails','Ponytail','Dreadlocks','Undercut','Shaggy','Space Buns']
const bodyTypes = ['Slim','Athletic','Muscular','Curvy','Petite','Tall','Broad','Stocky']
const genders = ['Female','Male','Non-Binary','Androgynous']
const ages = ['13-17','18-22','23-27','28-32','33-37','38-45','46-55','Ageless']
const personalityTraits = ['Extrovert','Introvert','Adventurous','Intellectual','Rebel','Elegant','Fun','Mysterious','Empathic','Bold','Dreamer','Charismatic','Stoic','Playful','Fierce','Gentle']
const fashionStyles = ['Streetwear','High Fashion','Bohemian','Minimalist','Y2K','Dark Academia','Cottagecore','Cyberpunk','Old Money','Avant-Garde','Athleisure','Gothic','Military','Lolita','Techwear','Grunge','Preppy','Punk','Retro 70s','Kawaii','Western','Fantasy Armor','Sci-Fi Suit','Royal/Regal']
const accessories = ['Sunglasses','Piercings','Tattoos','Jewelry','Hats','Scarves','Bags','Watches','Gloves','Choker','Crown/Tiara','Wings','Horns','Tail','Elf Ears','Mask','Cape','Belt Chain']

// Skin textures
const skinTextures = [
  { id:'human', label:'Human', desc:'Natural human skin', prompt:'natural human skin texture' },
  { id:'scales', label:'Scales', desc:'Reptile / Dragon', prompt:'reptilian scaled skin texture, visible scales' },
  { id:'feathers', label:'Feathers', desc:'Avian / Bird', prompt:'feathered skin, covered in soft plumage' },
  { id:'fur', label:'Fur', desc:'Beast / Animal', prompt:'soft fur-covered body, animal fur texture' },
  { id:'metallic', label:'Metallic', desc:'Robot / Android', prompt:'metallic chrome skin, robot-like surface, mechanical joints' },
  { id:'crystal', label:'Crystal', desc:'Gem / Mineral', prompt:'crystalline translucent skin, gem-like facets, refractive surface' },
  { id:'bark', label:'Bark', desc:'Tree / Wood', prompt:'bark-like woody skin texture, organic tree-like surface' },
  { id:'ethereal', label:'Ethereal', desc:'Ghost / Spirit', prompt:'translucent ethereal ghostly skin, faintly glowing, semi-transparent' },
  { id:'stone', label:'Stone', desc:'Golem / Rock', prompt:'rough stone skin texture, cracked rock surface, granite-like' },
  { id:'slime', label:'Slime', desc:'Gel / Ooze', prompt:'gelatinous translucent body, slime-like jelly texture' },
]

// Skin tone name for prompt
function skinToneName(idx: number): string {
  if (idx < skinTonesHuman.length) return `skin tone ${skinTonesHuman[idx]}`
  const fantasy = skinTonesFantasy[idx - skinTonesHuman.length]
  return fantasy ? `${fantasy.label.toLowerCase()} skin` : 'skin'
}

// Eye color name for prompt
function eyeColorName(idx: number): string {
  if (idx < eyeColorsNatural.length) return `${eyeColorsNatural[idx]} eyes`
  const fantasy = eyeColorsFantasy[idx - eyeColorsNatural.length]
  return fantasy ? `${fantasy.label.toLowerCase()} glowing eyes` : 'eyes'
}

// Hair color name for prompt
function hairColorName(idx: number): string {
  if (idx < hairColorsNatural.length) return `hair color ${hairColorsNatural[idx]}`
  const fantasy = hairColorsFantasy[idx - hairColorsNatural.length]
  return fantasy ? `${fantasy.label.toLowerCase()} hair` : 'hair'
}

export function UploadCharacter({ onNav }: { onNav?: (page: string) => void }) {
  const [mode, setMode] = useState<'create'|'import'>('create')
  const [step, setStep] = useState(0)
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)
  const [selRenderStyle, setSelRenderStyle] = useState(0)
  const [name, setName] = useState('')
  const [selFace, setSelFace] = useState(0)
  const [selSkin, setSelSkin] = useState(2)
  const [selEyes, setSelEyes] = useState(0)
  const [selHairS, setSelHairS] = useState(1)
  const [selHairC, setSelHairC] = useState(2)
  const [selBody, setSelBody] = useState<number[]>([0])
  const [selSkinTexture, setSelSkinTexture] = useState(0)
  const [selAge, setSelAge] = useState(1)
  const [selGender, setSelGender] = useState(0)
  const [selTraits, setSelTraits] = useState<number[]>([0,3,7])
  const [selFashion, setSelFashion] = useState<number[]>([0,7])
  const [selAccessories, setSelAccessories] = useState<string[]>([])
  const [sliders, setSliders] = useState({ jaw:50, cheek:60, nose:45, lip:65, eye:55, brow:50 })
  const [bodySliders, setBodySliders] = useState({ height:50, shoulders:50, waist:50, build:50, legs:50 })

  // Functional state
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [pendingCharacter, setPendingCharacter] = useState<SavedCharacter | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [importName, setImportName] = useState('')
  const [importStyle, setImportStyle] = useState('')
  const [importBio, setImportBio] = useState('')
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customSkinColor, setCustomSkinColor] = useState('#B08060')

  // Stores and services
  const addCharacter = useCharacterStore(s => s.addCharacter)
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()

  const steps = ['Render Style','Identity','Face','Body','Personality','Fashion']
  const toggleArr = (arr: number[], set: (v:number[])=>void, i: number, max: number) => {
    set(arr.includes(i) ? arr.filter(x=>x!==i) : arr.length < max ? [...arr,i] : arr)
  }

  const toggleAccessory = (a: string) => {
    setSelAccessories(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : prev.length < 6 ? [...prev, a] : prev
    )
  }

  const toggleBody = (i: number) => {
    setSelBody(prev =>
      prev.includes(i) ? (prev.length > 1 ? prev.filter(x => x !== i) : prev) : prev.length < 3 ? [...prev, i] : prev
    )
  }

  // Get current skin color (handles custom)
  const currentSkinColor = selSkin < allSkinTones.length ? allSkinTones[selSkin] : customSkinColor
  const currentEyeColor = allEyeColors[selEyes] || allEyeColors[0]
  const currentHairColor = allHairColors[selHairC] || allHairColors[0]

  const handleGenerate = async () => {
    if (!name.trim()) { toast.error('Enter a name for the character'); return }

    const cost = 2
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    try {
      const style = renderStyles[selRenderStyle]
      const texture = skinTextures[selSkinTexture]

      const bodyDesc = selBody.map(i => bodyTypes[i].toLowerCase()).join(' and ')
      const heightDesc = bodySliders.height < 30 ? 'short' : bodySliders.height > 70 ? 'tall' : 'average height'
      const shoulderDesc = bodySliders.shoulders < 30 ? 'narrow shoulders' : bodySliders.shoulders > 70 ? 'broad shoulders' : ''
      const waistDesc = bodySliders.waist < 30 ? 'narrow waist' : bodySliders.waist > 70 ? 'wide waist' : ''
      const buildDesc = bodySliders.build < 30 ? 'lean build' : bodySliders.build > 70 ? 'heavy build' : ''
      const legDesc = bodySliders.legs < 30 ? 'short legs' : bodySliders.legs > 70 ? 'long legs' : ''
      const proportions = [heightDesc, shoulderDesc, waistDesc, buildDesc, legDesc].filter(Boolean).join(', ')

      const characteristics = [
        `${genders[selGender]}`,
        `${ages[selAge]} years old`,
        `${faceShapes[selFace].toLowerCase()} face`,
        skinToneName(selSkin),
        texture.id !== 'human' ? texture.prompt : '',
        eyeColorName(selEyes),
        `${hairStyles[selHairS].toLowerCase()} ${hairColorName(selHairC)}`,
        `${bodyDesc} body type`,
        proportions,
        selTraits.map(i => personalityTraits[i]).join(', '),
      ].filter(Boolean).join('. ')

      const outfitDescription = selFashion.map(i => fashionStyles[i]).join(', ')
      const fullCharacteristics = `${style.prompt} ${characteristics}`

      const params: InfluencerParams = {
        characters: [{
          id: crypto.randomUUID(),
          characteristics: fullCharacteristics,
          outfitDescription,
          pose: 'Standing casual, facing camera',
          accessory: selAccessories.join(', '),
        }],
        scenario: style.scenario,
        lighting: style.id === 'anime' ? 'Flat anime lighting, cel-shaded' : style.id === 'pixel-art' ? 'Flat pixel art lighting' : 'Soft studio lighting',
        imageSize: ImageSize.Size2K,
        aspectRatio: AspectRatio.Portrait,
        numberOfImages: 1,
      }

      const results = await generateInfluencerImage(params, () => {})

      if (results.length > 0) {
        setGeneratedImage(results[0])

        const response = await fetch(results[0])
        const blob = await response.blob()

        const character: SavedCharacter = {
          id: crypto.randomUUID(),
          name: name.trim(),
          thumbnail: results[0],
          modelImageBlobs: [blob],
          outfitBlob: null,
          outfitDescription,
          characteristics: fullCharacteristics,
          accessory: selAccessories.join(', '),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0,
        }

        setPendingCharacter(character)
      }
    } catch (err) {
      restoreCredits(cost)
      toast.error('Error generating character')
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveCharacter = () => {
    if (pendingCharacter) {
      addCharacter(pendingCharacter)
      toast.success(`${pendingCharacter.name} saved successfully`)
      setPendingCharacter(null)
      setGeneratedImage(null)
      setStep(0)
      setName('')
    }
  }

  const handleDiscardCharacter = () => {
    setPendingCharacter(null)
    setGeneratedImage(null)
    toast.info('Character discarded')
  }

  const handleImport = async () => {
    if (importFiles.length === 0) { toast.error('Upload at least one image'); return }
    if (!importName.trim()) { toast.error('Enter a name'); return }

    setGenerating(true)
    try {
      const reader = new FileReader()
      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(importFiles[0])
      })

      const blobs: Blob[] = importFiles.map(f => f as Blob)

      const character: SavedCharacter = {
        id: crypto.randomUUID(),
        name: importName.trim(),
        thumbnail: thumbnailDataUrl,
        modelImageBlobs: blobs,
        outfitBlob: null,
        outfitDescription: importStyle,
        characteristics: importBio,
        accessory: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      }

      addCharacter(character)
      toast.success(`${importName} imported successfully`)

      setImportFiles([])
      setImportName('')
      setImportStyle('')
      setImportBio('')
    } catch (err) {
      toast.error('Error importing character')
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length > 0) setImportFiles(prev => [...prev, ...files].slice(0, 20))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length > 0) setImportFiles(prev => [...prev, ...files].slice(0, 20))
    e.target.value = ''
  }

  const Chip = ({ label, active, onClick, color='var(--accent)' }: { label:string; active:boolean; onClick:()=>void; color?:string; [key:string]:any }) => (
    <button onClick={onClick} className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all"
      style={{
        background: active ? `${color}12` : 'var(--bg-3)',
        border: `1px solid ${active ? `${color}30` : 'var(--border)'}`,
        color: active ? color : 'var(--text-2)',
      }}>{label}</button>
  )

  // Body silhouette dimensions (multi-select aware)
  const hasBody = (label: string) => selBody.some(i => bodyTypes[i] === label)
  const baseBodyW = hasBody('Broad') || hasBody('Stocky') ? 20 : hasBody('Curvy') ? 18 : hasBody('Slim') || hasBody('Petite') ? 12 : 15
  const bodyW = baseBodyW + (bodySliders.build - 50) / 15
  const baseShoulder = hasBody('Muscular') || hasBody('Athletic') || hasBody('Broad') ? 22 : hasBody('Slim') || hasBody('Petite') ? 13 : 16
  const shoulderW = baseShoulder + (bodySliders.shoulders - 50) / 12
  const bodyHeight = 48 + (bodySliders.height - 50) / 3
  const bodyRadius = hasBody('Curvy') ? '40% 40% 35% 35%' : '30%'
  const textureOverlay = selSkinTexture > 0 ? skinTextures[selSkinTexture].id : null

  // Style background for preview
  const previewBg = generatedImage
    ? 'var(--bg-2)'
    : renderStyles[selRenderStyle]?.bg || 'var(--bg-2)'

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold font-serif" style={{ color:'var(--text-1)' }}>
          Upload <span className="text-gradient">Character</span>
        </h1>
        <p className="text-sm mt-1" style={{ color:'var(--text-2)' }}>Create from scratch or import reference images</p>
      </div>

      {/* Mode Toggle */}
      <div className="px-8 py-4">
        <div className="inline-flex rounded-xl p-1" style={{ background:'var(--bg-2)' }}>
          {(['create','import'] as const).map(m => (
            <button key={m} onClick={()=>setMode(m)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: mode===m ? 'var(--bg-4)' : 'transparent',
                color: mode===m ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: mode===m ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
              }}>
              {m === 'create' ? '\u2295 Create from Scratch' : '\u2191 Import Images'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'import' ? (
        /* IMPORT MODE */
        <div className="px-8 pb-8 flex gap-6">
          <div className="flex-1">
            {/* Drop Zone */}
            <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
            <div className="card p-8 text-center cursor-pointer hover:border-[var(--border-h)] transition-all mb-5"
              style={{ borderStyle:'dashed', borderColor: dragOver ? 'var(--accent)' : undefined }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}>
              <div className="text-4xl mb-3" style={{ color:'var(--accent)' }}>{'\u2191'}</div>
              <div className="text-sm font-semibold mb-1" style={{ color:'var(--text-1)' }}>Drag images of your character</div>
              <div className="text-[11px]" style={{ color:'var(--text-3)' }}>PNG, JPG, WEBP · Up to 20 images · Max 10MB each</div>
              <div className="text-[11px] mt-2 px-3 py-1.5 rounded-lg inline-block"
                style={{ background:'rgba(240,104,72,.1)', color:'var(--accent)' }}>
                or click to select files
              </div>
            </div>

            {/* Uploaded preview grid */}
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>
              Uploaded Images ({importFiles.length}/20)
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[0,1,2,3,4,5,6,7,8,9].map(i => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03]"
                  onClick={() => { if (i >= importFiles.length) fileInputRef.current?.click() }}
                  style={{
                    background: i < importFiles.length ? 'var(--bg-3)' : 'var(--bg-2)',
                    border: `1px solid ${i < importFiles.length ? 'var(--border-h)' : 'var(--border)'}`,
                  }}>
                  {i < importFiles.length ? (
                    <img src={URL.createObjectURL(importFiles[i])} className="w-full h-full object-cover" alt={importFiles[i].name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-lg" style={{ color:'var(--text-3)' }}>+</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Import Settings */}
            <div className="card p-5 mt-5 space-y-4">
              <div className="text-xs font-semibold" style={{ color:'var(--text-1)' }}>Import Settings</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1.5" style={{ color:'var(--text-3)' }}>Name</label>
                  <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="Character name" className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-colors"
                    style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1.5" style={{ color:'var(--text-3)' }}>Style</label>
                  <input value={importStyle} onChange={e => setImportStyle(e.target.value)} placeholder="E.g.: Streetwear, Fashion" className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-colors"
                    style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase block mb-1.5" style={{ color:'var(--text-3)' }}>Description / Bio</label>
                <textarea value={importBio} onChange={e => setImportBio(e.target.value)} rows={3} placeholder="Describe the character, AI will use this to maintain consistency..." className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-colors resize-none"
                  style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }} />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase mb-2" style={{ color:'var(--text-3)' }}>AI will automatically extract</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Face','Body','Skin','Hair','Features','Default Pose','Clothing Style','Color Palette'].map(t => (
                    <span key={t} className="badge" style={{ background:'rgba(208,72,176,.1)', color:'var(--magenta)' }}>{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={handleImport} disabled={generating} className="btn-primary w-full py-3 text-sm">
                {generating ? '\u21BB Importing...' : '\u2726 Analyze with AI and Create Character'}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-[300px] shrink-0">
            <div className="card p-5 sticky top-8">
              <div className="text-[10px] font-mono uppercase tracking-wider text-center mb-3" style={{ color:'var(--text-3)' }}>Preview</div>
              <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-3" style={{ background:'var(--bg-3)', border:'1px solid var(--border)' }}>
                {importFiles.length > 0 ? (
                  <img src={URL.createObjectURL(importFiles[0])} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2" style={{ color:'var(--text-3)' }}>{'\u25C8'}</div>
                      <div className="text-[11px]" style={{ color:'var(--text-3)' }}>Upload images to<br/>generate preview</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-center" style={{ color:'var(--text-3)' }}>
                AI will generate a consistent 3D model from your images
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CREATE MODE */
        <div className="px-8 pb-8 flex gap-6">
          <div className="flex-1 max-w-2xl">
            {/* Steps */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {steps.map((s,i) => (
                <button key={s} onClick={()=>setStep(i)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0"
                  style={{
                    background: step===i ? 'rgba(240,104,72,.1)' : 'transparent',
                    color: step===i ? 'var(--accent)' : step>i ? 'var(--magenta)' : 'var(--text-3)',
                    border: step===i ? '1px solid rgba(240,104,72,.2)' : '1px solid transparent',
                  }}>
                  <span className="rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: step>=i ? (step===i ? 'var(--accent)' : 'var(--magenta)') : 'var(--bg-3)',
                      color: step>=i ? '#fff' : 'var(--text-3)',
                      width:18, height:18,
                    }}>
                    {step>i ? '\u2713' : i+1}
                  </span>
                  {s}
                </button>
              ))}

              {/* Engine selector wrench button */}
              <div className="relative shrink-0 ml-auto">
                <button
                  onClick={() => setShowEngineModal(v => !v)}
                  className="btn-ghost w-8 h-8 rounded-lg flex items-center justify-center text-sm relative"
                  title="Generation Engine"
                >
                  🔧
                  {selectedEngine !== 'auto' && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </button>

                {/* Engine modal rendered at top level below */}
              </div>
            </div>

            <div className="card p-6 space-y-5">
              {/* Step 0: Render Style */}
              {step===0 && <>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-3" style={{ color:'var(--text-3)' }}>Choose Render Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {renderStyles.map((rs, i) => (
                      <button key={rs.id} onClick={() => setSelRenderStyle(i)}
                        className="p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                        style={{
                          background: selRenderStyle===i ? rs.bg : 'var(--bg-3)',
                          border: `1.5px solid ${selRenderStyle===i ? 'rgba(240,104,72,.3)' : 'var(--border)'}`,
                          boxShadow: selRenderStyle===i ? '0 0 20px rgba(240,104,72,.08)' : 'none',
                        }}>
                        <span className="text-xl block mb-1.5">{rs.icon}</span>
                        <div className="text-[12px] font-semibold" style={{ color: selRenderStyle===i ? 'var(--accent)' : 'var(--text-1)' }}>{rs.label}</div>
                        <div className="text-[9px] mt-0.5" style={{ color:'var(--text-3)' }}>{rs.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>}

              {/* Step 1: Identity */}
              {step===1 && <>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1.5" style={{ color:'var(--text-3)' }}>Name</label>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="E.g.: Luna Vex"
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none focus:border-[rgba(240,104,72,.4)] transition-colors"
                    style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Gender</label>
                  <div className="grid grid-cols-4 gap-2">
                    {genders.map((g,i) => <Chip key={g} label={g} active={selGender===i} onClick={()=>setSelGender(i)} />)}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Age</label>
                  <div className="flex gap-2">
                    {ages.map((a,i) => <Chip key={a} label={a} active={selAge===i} onClick={()=>setSelAge(i)} color="var(--magenta)" />)}
                  </div>
                </div>
              </>}

              {/* Step 2: Face */}
              {step===2 && <>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Face Shape</label>
                  <div className="grid grid-cols-3 gap-2">
                    {faceShapes.map((f,i) => <Chip key={f} label={f} active={selFace===i} onClick={()=>setSelFace(i)} />)}
                  </div>
                </div>

                {/* Skin Tones — Human */}
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Skin Tone</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {skinTonesHuman.map((c,i) => (
                      <button key={c} onClick={()=>setSelSkin(i)} className="w-8 h-8 rounded-full transition-all"
                        style={{ background:c, border: selSkin===i ? '3px solid var(--accent)' : '3px solid transparent',
                          boxShadow: selSkin===i ? '0 0 12px rgba(240,104,72,.3)' : 'none', transform: selSkin===i ? 'scale(1.15)' : 'scale(1)' }} />
                    ))}
                  </div>
                </div>
                {/* Skin Tones — Fantasy */}
                <div>
                  <label className="text-[9px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Fantasy / Non-Human</label>
                  <div className="flex gap-2 flex-wrap">
                    {skinTonesFantasy.map((s, i) => {
                      const idx = skinTonesHuman.length + i
                      return (
                        <button key={s.c} onClick={()=>setSelSkin(idx)} className="flex flex-col items-center gap-0.5 group"
                          title={s.label}>
                          <div className="w-8 h-8 rounded-full transition-all"
                            style={{ background:s.c, border: selSkin===idx ? '3px solid var(--accent)' : '2px solid rgba(255,255,255,.08)',
                              boxShadow: selSkin===idx ? '0 0 12px rgba(240,104,72,.3)' : 'none', transform: selSkin===idx ? 'scale(1.15)' : 'scale(1)' }} />
                          <span className="text-[7px] font-mono" style={{ color: selSkin===idx ? 'var(--accent)' : 'var(--text-3)' }}>{s.label}</span>
                        </button>
                      )
                    })}
                    {/* Custom color picker */}
                    <button className="flex flex-col items-center gap-0.5 relative">
                      <input type="color" value={customSkinColor} onChange={e => { setCustomSkinColor(e.target.value); setSelSkin(allSkinTones.length) }}
                        className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer" />
                      <div className="w-8 h-8 rounded-full transition-all flex items-center justify-center text-[10px]"
                        style={{ background: selSkin >= allSkinTones.length ? customSkinColor : 'var(--bg-3)',
                          border: selSkin >= allSkinTones.length ? '3px solid var(--accent)' : '2px dashed var(--border)',
                          color:'var(--text-3)' }}>
                        {selSkin < allSkinTones.length && '+'}
                      </div>
                      <span className="text-[7px] font-mono" style={{ color:'var(--text-3)' }}>Custom</span>
                    </button>
                  </div>
                </div>

                {/* Skin Texture */}
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Skin Texture</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {skinTextures.map((t, i) => (
                      <button key={t.id} onClick={() => setSelSkinTexture(i)}
                        className="px-2 py-2 rounded-lg text-center transition-all"
                        style={{
                          background: selSkinTexture === i ? 'rgba(208,72,176,.12)' : 'var(--bg-3)',
                          border: `1px solid ${selSkinTexture === i ? 'rgba(208,72,176,.3)' : 'var(--border)'}`,
                        }}>
                        <div className="text-[10px] font-medium" style={{ color: selSkinTexture === i ? 'var(--magenta)' : 'var(--text-1)' }}>{t.label}</div>
                        <div className="text-[7px] font-mono" style={{ color:'var(--text-3)' }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eye Colors — Natural */}
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Eye Color</label>
                  <div className="flex gap-2.5">
                    {eyeColorsNatural.map((c,i) => (
                      <button key={c} onClick={()=>setSelEyes(i)} className="w-7 h-7 rounded-full transition-all"
                        style={{ background:c, border: selEyes===i ? '3px solid var(--magenta)' : '2px solid rgba(255,255,255,.08)',
                          boxShadow: selEyes===i ? `0 0 10px ${c}` : 'none', transform: selEyes===i ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                  </div>
                </div>
                {/* Eye Colors — Fantasy */}
                <div>
                  <label className="text-[9px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Fantasy Eyes</label>
                  <div className="flex gap-2">
                    {eyeColorsFantasy.map((e, i) => {
                      const idx = eyeColorsNatural.length + i
                      return (
                        <button key={e.c} onClick={()=>setSelEyes(idx)} className="flex flex-col items-center gap-0.5" title={e.label}>
                          <div className="w-7 h-7 rounded-full transition-all"
                            style={{ background:e.c, border: selEyes===idx ? '3px solid var(--magenta)' : '2px solid rgba(255,255,255,.08)',
                              boxShadow: selEyes===idx ? `0 0 10px ${e.c}` : 'none', transform: selEyes===idx ? 'scale(1.2)' : 'scale(1)' }} />
                          <span className="text-[7px] font-mono" style={{ color: selEyes===idx ? 'var(--magenta)' : 'var(--text-3)' }}>{e.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase block" style={{ color:'var(--text-3)' }}>Fine Tuning</label>
                  {Object.entries({ jaw:'Jaw', cheek:'Cheekbones', nose:'Nose', lip:'Lips', eye:'Eyes', brow:'Brows' }).map(([k,l]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-[10px] w-20 shrink-0" style={{ color:'var(--text-2)' }}>{l}</span>
                      <input type="range" min={0} max={100} value={(sliders as any)[k]}
                        onChange={e => setSliders({...sliders, [k]: +e.target.value})} className="flex-1 slider-t" />
                      <span className="text-[10px] font-mono w-6 text-right" style={{ color:'var(--accent)' }}>{(sliders as any)[k]}</span>
                    </div>
                  ))}
                </div>

                {/* Hair Style */}
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Hair Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {hairStyles.map((h,i) => <Chip key={h} label={h} active={selHairS===i} onClick={()=>setSelHairS(i)} />)}
                  </div>
                </div>

                {/* Hair Colors — Natural */}
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Hair Color</label>
                  <div className="flex gap-2.5">
                    {hairColorsNatural.map((c,i) => (
                      <button key={c+i} onClick={()=>setSelHairC(i)} className="w-7 h-7 rounded-full transition-all"
                        style={{ background:c, border: selHairC===i ? '3px solid var(--accent)' : '2px solid rgba(255,255,255,.06)',
                          transform: selHairC===i ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                  </div>
                </div>
                {/* Hair Colors — Fantasy */}
                <div>
                  <label className="text-[9px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Unnatural Hair</label>
                  <div className="flex gap-2">
                    {hairColorsFantasy.map((h, i) => {
                      const idx = hairColorsNatural.length + i
                      return (
                        <button key={h.c} onClick={()=>setSelHairC(idx)} className="flex flex-col items-center gap-0.5" title={h.label}>
                          <div className="w-7 h-7 rounded-full transition-all"
                            style={{ background:h.c, border: selHairC===idx ? '3px solid var(--accent)' : '2px solid rgba(255,255,255,.06)',
                              transform: selHairC===idx ? 'scale(1.2)' : 'scale(1)' }} />
                          <span className="text-[7px] font-mono" style={{ color: selHairC===idx ? 'var(--accent)' : 'var(--text-3)' }}>{h.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>}

              {/* Step 3: Body */}
              {step===3 && <>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1" style={{ color:'var(--text-3)' }}>Body Type <span style={{ color:'var(--text-3)', fontWeight:400 }}>(pick up to 3, combine them)</span></label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {bodyTypes.map((b,i) => <Chip key={b} label={b} active={selBody.includes(i)} onClick={()=>toggleBody(i)} color="var(--magenta)" />)}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase block" style={{ color:'var(--text-3)' }}>Proportions</label>
                  {([
                    { key:'height', label:'Height', lo:'Short / Compact', hi:'Tall / Towering' },
                    { key:'shoulders', label:'Shoulders', lo:'Narrow / Slim', hi:'Broad / Wide' },
                    { key:'waist', label:'Waist', lo:'Narrow / Cinched', hi:'Wide / Thick' },
                    { key:'build', label:'Build', lo:'Lean / Light', hi:'Heavy / Bulky' },
                    { key:'legs', label:'Leg Length', lo:'Short Legs', hi:'Long Legs' },
                  ] as const).map(p => (
                    <div key={p.key}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[8px] font-mono" style={{ color:'var(--text-3)' }}>{p.lo}</span>
                        <span className="text-[10px] font-medium" style={{ color:'var(--text-2)' }}>{p.label}</span>
                        <span className="text-[8px] font-mono" style={{ color:'var(--text-3)' }}>{p.hi}</span>
                      </div>
                      <input type="range" min={0} max={100} value={(bodySliders as any)[p.key]}
                        onChange={e => setBodySliders({...bodySliders, [p.key]: +e.target.value})} className="w-full slider-t" />
                    </div>
                  ))}
                </div>
              </>}

              {/* Step 4: Personality */}
              {step===4 && <>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1" style={{ color:'var(--text-3)' }}>Personality Traits (max 5)</label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {personalityTraits.map((t,i) => (
                      <button key={t} onClick={()=>toggleArr(selTraits,setSelTraits,i,5)}
                        className="px-3 py-1.5 rounded-full text-[11px] transition-all"
                        style={{
                          background: selTraits.includes(i) ? 'rgba(240,104,72,.12)' : 'var(--bg-3)',
                          border: `1px solid ${selTraits.includes(i) ? 'rgba(240,104,72,.3)' : 'var(--border)'}`,
                          color: selTraits.includes(i) ? 'var(--accent)' : 'var(--text-2)',
                        }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase block" style={{ color:'var(--text-3)' }}>Voice and Tone</label>
                  {[{l:'Formality',a:'Casual',b:'Formal'},{l:'Humor',a:'Serious',b:'Fun'},{l:'Energy',a:'Calm',b:'Intense'},{l:'Confidence',a:'Humble',b:'Bold'}].map(v=>(
                    <div key={v.l}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px]" style={{ color:'var(--text-3)' }}>{v.a}</span>
                        <span className="text-[10px]" style={{ color:'var(--text-2)' }}>{v.l}</span>
                        <span className="text-[9px]" style={{ color:'var(--text-3)' }}>{v.b}</span>
                      </div>
                      <input type="range" min={0} max={100} defaultValue={50} className="slider-t" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1.5" style={{ color:'var(--text-3)' }}>Backstory</label>
                  <textarea rows={4} placeholder="Character backstory..."
                    className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none resize-none transition-colors"
                    style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }} />
                </div>
              </>}

              {/* Step 5: Fashion */}
              {step===5 && <>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-1" style={{ color:'var(--text-3)' }}>Fashion Styles (max 4)</label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fashionStyles.map((f,i) => (
                      <button key={f} onClick={()=>toggleArr(selFashion,setSelFashion,i,4)}
                        className="px-3 py-1.5 rounded-full text-[11px] transition-all"
                        style={{
                          background: selFashion.includes(i) ? 'rgba(208,72,176,.12)' : 'var(--bg-3)',
                          border: `1px solid ${selFashion.includes(i) ? 'rgba(208,72,176,.3)' : 'var(--border)'}`,
                          color: selFashion.includes(i) ? 'var(--magenta)' : 'var(--text-2)',
                        }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Signature Accessories</label>
                  <div className="grid grid-cols-4 gap-2">
                    {accessories.map(a=>(
                      <button key={a} onClick={() => toggleAccessory(a)}
                        className="btn-ghost px-2 py-2 text-[10px] transition-all"
                        style={{
                          background: selAccessories.includes(a) ? 'rgba(72,88,224,.12)' : undefined,
                          borderColor: selAccessories.includes(a) ? 'rgba(72,88,224,.3)' : undefined,
                          color: selAccessories.includes(a) ? 'var(--blue)' : undefined,
                        }}>{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block mb-2" style={{ color:'var(--text-3)' }}>Color Palette</label>
                  <div className="flex gap-2">
                    {['#E8725C','#C9A55C','#B86068','#1A191F','#F0DCC0'].map(c => (
                      <div key={c} className="w-11 h-11 rounded-xl" style={{ background:c, border:'1px solid var(--border)' }} />
                    ))}
                    <button className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                      style={{ border:'1px dashed var(--border)', color:'var(--text-3)' }}>+</button>
                  </div>
                </div>
              </>}
            </div>

            {/* Nav */}
            <div className="flex justify-between mt-5">
              <button onClick={()=>setStep(Math.max(0,step-1))} className="btn-ghost px-5 py-2.5 text-sm"
                style={{ opacity: step===0?.3:1 }} disabled={step===0}>{'\u2190'} Back</button>
              <button onClick={() => step < 5 ? setStep(step + 1) : handleGenerate()} className="btn-primary px-6 py-2.5 text-sm"
                disabled={generating}>
                {generating ? '\u21BB Generating...' : step === 5 ? '\u2726 Generate Character' : 'Next \u2192'}
              </button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="w-[320px] shrink-0">
            <div className="card p-5 sticky top-8">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Live Preview</div>
                {/* Render style badge */}
                <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-md"
                  style={{ background:'linear-gradient(135deg, rgba(240,104,72,.15), rgba(208,72,176,.15))', color:'var(--accent)' }}>
                  {renderStyles[selRenderStyle]?.label.toUpperCase()}
                </span>
              </div>
              <div className="aspect-[3/4] rounded-2xl overflow-hidden relative"
                style={{ background: generatedImage ? 'var(--bg-2)' : previewBg, border:'1px solid var(--border)' }}>
                {generatedImage ? (
                  <div className="relative w-full h-full group cursor-pointer" onClick={() => setShowLightbox(true)}>
                    <img src={generatedImage} className="w-full h-full object-cover" alt={name} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity font-medium backdrop-blur-sm px-3 py-1.5 rounded-lg"
                        style={{ background:'rgba(0,0,0,.4)' }}>Click to enlarge</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {/* Texture overlay pattern */}
                    {textureOverlay && (
                      <div className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none" style={{
                        background: textureOverlay === 'scales' ? 'repeating-conic-gradient(rgba(255,255,255,.15) 0% 25%, transparent 0% 50%) 0 0/12px 12px'
                          : textureOverlay === 'fur' ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0px, transparent 2px, transparent 4px)'
                          : textureOverlay === 'crystal' ? 'repeating-linear-gradient(60deg, rgba(200,220,255,.1) 0px, transparent 1px, transparent 8px)'
                          : textureOverlay === 'bark' ? 'repeating-linear-gradient(0deg, rgba(139,90,43,.1) 0px, transparent 3px, transparent 6px)'
                          : 'none',
                      }} />
                    )}
                    <div className="relative">
                      {/* Hair */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-t-full transition-all"
                        style={{ width: selHairS<3?'95px':'75px', height: selHairS===0?'70px':selHairS===1?'50px':'35px',
                          background: currentHairColor, opacity:selHairS===8?0:1 }} />
                      {/* Face */}
                      <div className="w-20 h-24 mx-auto relative transition-all"
                        style={{ background: currentSkinColor, borderRadius: selFace===0?'45%':selFace===1?'50%':selFace===2?'30%':selFace===3?'40% 40% 35% 35%':selFace===4?'25%':selFace===5?'35% 50% 35% 50%':'42% 42% 38% 38%' }}>
                        {/* Brows */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-5">
                          <div style={{ width:'10px', height:'2px', background:`${currentSkinColor}99`, borderRadius:'2px', transform:`rotate(-${sliders.brow/8}deg)` }} />
                          <div style={{ width:'10px', height:'2px', background:`${currentSkinColor}99`, borderRadius:'2px', transform:`rotate(${sliders.brow/8}deg)` }} />
                        </div>
                        {/* Eyes */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3.5">
                          <div className="rounded-full transition-all" style={{ width:`${8+sliders.eye/18}px`, height:`${8+sliders.eye/18}px`, background: currentEyeColor, boxShadow:`0 0 6px ${currentEyeColor}40` }} />
                          <div className="rounded-full transition-all" style={{ width:`${8+sliders.eye/18}px`, height:`${8+sliders.eye/18}px`, background: currentEyeColor, boxShadow:`0 0 6px ${currentEyeColor}40` }} />
                        </div>
                        {/* Nose */}
                        <div className="absolute top-12 left-1/2 -translate-x-1/2" style={{ width:`${3+sliders.nose/25}px`, height:'6px', background:`${currentSkinColor}66`, borderRadius:'50%' }} />
                        {/* Mouth */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
                          style={{ width:`${10+sliders.lip/8}px`, height:`${3+sliders.lip/40}px`, background:`${currentSkinColor}88` }} />
                        {/* Jaw line */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-b-full"
                          style={{ width:`${50+sliders.jaw/3}%`, height:'4px', background:`${currentSkinColor}22` }} />
                      </div>
                    </div>
                    {/* Body silhouette */}
                    <div className="mt-1 flex flex-col items-center transition-all">
                      {/* Neck */}
                      <div style={{ width:'12px', height:'6px', background:`${currentSkinColor}55`, borderRadius:'0 0 4px 4px' }} />
                      {/* Shoulders */}
                      <div className="rounded-t-2xl transition-all" style={{ width:`${shoulderW*4}px`, height:'10px', background:`${currentSkinColor}55` }} />
                      {/* Torso */}
                      <div className="transition-all" style={{
                        width:`${bodyW*4}px`, height:`${bodyHeight}px`,
                        background:`${currentSkinColor}44`, borderRadius: bodyRadius,
                        clipPath: hasBody('Athletic') || hasBody('Muscular') ? 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)' : 'none',
                      }} />
                      {/* Legs hint */}
                      <div className="flex gap-1 -mt-0.5">
                        <div style={{ width:'14px', height:`${16 + bodySliders.legs/5}px`, background:`${currentSkinColor}33`, borderRadius:'0 0 6px 6px' }} />
                        <div style={{ width:'14px', height:`${16 + bodySliders.legs/5}px`, background:`${currentSkinColor}33`, borderRadius:'0 0 6px 6px' }} />
                      </div>
                    </div>
                    {/* Skin texture label */}
                    {selSkinTexture > 0 && (
                      <span className="mt-1.5 text-[7px] px-2 py-0.5 rounded-full font-mono" style={{ background:'rgba(208,72,176,.1)', color:'var(--magenta)' }}>
                        {skinTextures[selSkinTexture].label} skin
                      </span>
                    )}
                    {/* Accessory icons */}
                    {selAccessories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 justify-center px-2">
                        {selAccessories.map(a => (
                          <span key={a} className="text-[7px] px-1.5 py-0.5 rounded" style={{ background:'rgba(72,88,224,.1)', color:'var(--blue)' }}>{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background:'linear-gradient(transparent, rgba(0,0,0,.7))' }}>
                  <div className="text-sm font-bold text-white">{name || 'Unnamed'}</div>
                  <div className="text-[9px] font-mono" style={{ color:'var(--accent)' }}>
                    {genders[selGender]} · {ages[selAge]} · {selBody.map(i => bodyTypes[i]).join('+')}
                  </div>
                </div>
              </div>

              {/* Post-generation buttons */}
              {generatedImage && pendingCharacter ? (
                <div className="mt-3 space-y-2">
                  <button onClick={handleSaveCharacter} className="btn-primary w-full py-2.5 text-sm">Save Character</button>
                  <div className="flex gap-2">
                    <button onClick={handleGenerate} disabled={generating} className="btn-ghost flex-1 py-2 text-[11px]"
                      style={{ color:'var(--accent)' }}>
                      {generating ? '\u21BB ...' : '\u27F3 Regenerate'}
                    </button>
                    <button onClick={handleDiscardCharacter} className="btn-ghost flex-1 py-2 text-[11px]"
                      style={{ color:'var(--rose)' }}>Discard</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                  {selTraits.map(i => <span key={i} className="badge" style={{ background:'rgba(240,104,72,.1)', color:'var(--accent)' }}>{personalityTraits[i]}</span>)}
                  {selFashion.map(i => <span key={i} className="badge" style={{ background:'rgba(208,72,176,.1)', color:'var(--magenta)' }}>{fashionStyles[i]}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {/* Engine selector modal — rendered at top level for correct positioning */}
      {showEngineModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
          <div
            className="fixed z-50 w-[340px] max-h-[90vh] rounded-2xl"
            style={{
              display: 'flex', flexDirection: 'column',
              top: '50%', left: 'calc(50% + 110px)', transform: 'translate(-50%, -50%)',
              background: 'rgba(14,12,20,.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,.6)',
              overflow: 'hidden',
            }}
          >
            {/* Scrollable engine list */}
            <div className="overflow-y-auto p-4 pb-2 space-y-1 flex-1 min-h-0">
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-3)' }}>Generation Engine</div>

              <button
                onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                style={{
                  background: selectedEngine === 'auto' ? 'rgba(240,104,72,.08)' : 'transparent',
                  border: `1px solid ${selectedEngine === 'auto' ? 'rgba(240,104,72,.2)' : 'transparent'}`,
                }}
              >
                <span className="text-base">✨</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--accent)' : 'var(--text-1)' }}>Auto</div>
                  <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>Best engine automatically</div>
                </div>
              </button>

              <div className="h-px my-1" style={{ background: 'var(--border)' }} />

              {ENGINE_METADATA.map(engine => (
                <button
                  key={engine.key}
                  onClick={() => { setSelectedEngine(engine.key); setShowEngineModal(false) }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                  style={{
                    background: selectedEngine === engine.key ? 'rgba(240,104,72,.08)' : 'transparent',
                    border: `1px solid ${selectedEngine === engine.key ? 'rgba(240,104,72,.2)' : 'transparent'}`,
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>⚙</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium" style={{ color: selectedEngine === engine.key ? 'var(--accent)' : 'var(--text-1)' }}>{engine.userFriendlyName}</div>
                    <div className="text-[8px]" style={{ color: 'var(--text-3)' }}>{engine.description}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>{engine.creditCost}cr</div>
                    <div className="text-[8px] font-mono" style={{ color: 'var(--text-3)' }}>{engine.estimatedTime}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Sticky resolution footer */}
            <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-3)' }}>Resolution</div>
              <div className="flex gap-2">
                {[
                  { id: '1k', label: '1K', desc: '1024px' },
                  { id: '2k', label: '2K', desc: '2048px' },
                  { id: '4k', label: '4K', desc: '4096px' },
                ].map(r => (
                  <button key={r.id}
                    onClick={() => setSelectedResolution(r.id)}
                    className="flex-1 px-3 py-2 rounded-lg text-center transition-all"
                    style={{
                      background: selectedResolution === r.id ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                      border: `1px solid ${selectedResolution === r.id ? 'rgba(240,104,72,.25)' : 'var(--border)'}`,
                    }}>
                    <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--accent)' : 'var(--text-1)' }}>{r.label}</div>
                    <div className="text-[8px] font-mono" style={{ color: 'var(--text-3)' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {showLightbox && generatedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.92)' }}
          onClick={() => setShowLightbox(false)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white/70 hover:text-white transition-colors"
            style={{ background:'rgba(255,255,255,.1)' }}
            onClick={() => setShowLightbox(false)}>
            {'\u2715'}
          </button>
          <img src={generatedImage} alt={name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            style={{ boxShadow:'0 0 60px rgba(240,104,72,.15)' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

export default UploadCharacter
