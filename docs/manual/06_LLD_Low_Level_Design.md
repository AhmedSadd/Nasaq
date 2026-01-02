# 📄 Low-Level Design Document (LLD)
## Project: Nasaq (نسق)
**Version:** 1.1 (Final Complete)
**Document ID:** 06_LLD
**Date:** Jan 2026

---

### 1. 🎯 مقدمة ونطاق الوثيقة (Introduction)
تغوص هذه الوثيقة في التفاصيل التنفيذية الدقيقة (Micro-Architecture) للمكونات الحرجة. الهدف هو توفير خوارزميات ومنطق شبه-كودي (Pseudocode) جاهز للنسخ والتنفيذ من قبل كبار المطورين (Senior Developers).
يمنع الاجتهاد في المنطق المذكور أدناه إلا بمراجعة المعماري، لضمان توافق النظام مع متطلبات الأداء (16ms Latency) والأمان.

---

### 2. 🧭 الوحدة الأولى: محرك التوجيه والمحرر (Direction Engine & Editor Module)
**المسؤولية:** إدارة اتجاه النص (Auto/RTL/LTR) بأداء عالٍ، وإدارة دورة حياة المحرر لمنع تسرب الذاكرة.

#### 2.1 هيكل البيانات (Data Structure)
```typescript
// Enum لتمثيل الحالات الممكنة بدقة
export enum DirectionMode {
  AUTO = 'auto',
  RTL = 'rtl',
  LTR = 'ltr'
}

// واجهة الحالة في Zustand
interface EditorSettings {
  directionMode: DirectionMode;
}

```

#### 2.2 إعداد الحاوية المعزولة (Compartment Configuration)

**ملف:** `src/lib/editor/direction-conf.ts`

يجب استخدام نمط الـ Singleton لإنشاء الـ Compartment لضمان وجود نسخة واحدة فقط تتحكم في المحرر.

```typescript
import { Compartment } from '@codemirror/state';

// 1. إنشاء الحاوية (Global Constant)
export const directionCompartment = new Compartment();

```

#### 2.3 خوارزمية تكوين الإضافات (Extension Factory Logic)

**الدالة:** `getDirectionExtensions(mode: DirectionMode)`
هذه الدالة هي "الموزع" (Dispatcher) الذي يقرر أي Extensions تعمل حالياً.

**المنطق التفصيلي (Pseudocode):**

1. **INPUT:** `mode` (auto, rtl, ltr).
2. **SWITCH** `mode`:
* **CASE** `rtl`:
* RETURN array containing:
1. `EditorView.contentAttributes.of({ dir: 'rtl' })` -> يفرض سمة HTML.


* *ملاحظة:* لا نرجع الـ `AutoRTLPlugin` هنا (توفير CPU).




* **CASE** `ltr`:
* RETURN array containing:
1. `EditorView.contentAttributes.of({ dir: 'ltr' })`.




* **CASE** `auto` (Default):
* RETURN array containing:
1. `EditorView.contentAttributes.of({ dir: 'auto' })` -> يسمح للمتصفح بالمساعدة.
2. **`autoRTLPlugin`** -> تفعيل الخوارزمية الذكية (انظر 2.4).







#### 2.4 خوارزمية الفحص التلقائي (AutoRTL Plugin Algorithm)

**ملف:** `src/lib/editor/auto-rtl.ts`
**النوع:** `ViewPlugin` من CodeMirror.
**الهدف:** فحص الأسطر المرئية فقط وتلوينها.

**Logic Flow:**

1. **Regex Definition:**
* `const RTL_REGEX = /^(\W*)[^\u0000-\u007F]/;`
* *شرح:* `^` (بداية السطر) + `(\W*)` (تجاهل أي رموز غير أبجدية مثل `#` أو `> `) + `[^\u0000-\u007F]` (أي حرف ليس ASCII، أي العربي).


2. **Class Definition (`AutoRTLPlugin`):**
* **Property:** `decorations: DecorationSet` (يخزن التلوين الحالي).
* **Constructor(view):**
* استدعاء `this.buildDecorations(view)` لأول مرة.


* **Update(update):**
* **IF** (`docChanged` OR `viewportChanged`):
* `this.decorations = this.buildDecorations(update.view)`
* *تفسير:* لا نعيد الحساب إلا إذا تغير النص أو تحرك التمرير.






3. **Core Function (`buildDecorations(view)`):**
* Init `builder = new RangeSetBuilder<Decoration>()`.
* **LOOP** `range` OF `view.visibleRanges`: (فقط الأسطر الظاهرة في الشاشة!)
* **LOOP** `pos` FROM `range.from` TO `range.to`: (سطر بسطر)
* Get `line` object at `pos`.
* Get `text` content of `line` (max 100 chars optimization - لا داعي لفحص سطر طوله مليون حرف، البداية تكفي).
* **IF** `RTL_REGEX.test(text)`:
* Add Decoration: `class: 'cm-line-rtl'` to the line.


* **ELSE**:
* Add Decoration: `class: 'cm-line-ltr'` to the line.






* Return `builder.finish()`.



#### 2.5 دورة حياة المحرر (Editor Lifecycle)

**ملف:** `src/components/core/Editor/EditorWrapper.tsx`
**الهدف:** إدارة إنشاء وتدمير المحرر بشكل آمن مع React.

**Logic Flow:**

1. **Refs:**
* `editorParent = useRef<HTMLDivElement>(null)` (حاوية الـ DOM).
* `viewRef = useRef<EditorView | null>(null)` (مرجع المحرر).


2. **Effect (Mounting):**
* **Check:** IF `viewRef.current` exists OR `!editorParent.current` -> RETURN.
* **Init:**
```typescript
const view = new EditorView({
  state: EditorState.create({
    doc: initialContent,
    extensions: [ ...baseExtensions, directionCompartment.of(...) ]
  }),
  parent: editorParent.current
});

```


* **Assign:** `viewRef.current = view`.


3. **Effect (Unmounting):**
* **Cleanup:** `viewRef.current.destroy()`.
* **Nullify:** `viewRef.current = null`.



---

### 3. 📂 الوحدة الثانية: محول نظام الملفات (File System Adapter)

**المسؤولية:** تحويل واجهة FSA API المعقدة إلى واجهة استخدام بسيطة وموحدة، مع إدارة التكرار (Recursion) وقراءة الصور.

#### 3.1 هيكل كائن الملف الداخلي (Internal Node Schema)

```typescript
interface FileNode {
  id: string;        // Full path (e.g., "src/assets/logo.png")
  name: string;      // "logo.png"
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  children?: FileNode[]; // Only for directories
}

```

#### 3.2 خوارزمية قراءة الشجرة (Recursive Directory Read)

**الدالة:** `readDirectoryRecursive(dirHandle, pathPrefix)`
هذه الدالة خطيرة لأنها قد تدخل في حلقة لا نهائية أو تستهلك الذاكرة.

**Logic Flow:**

1. **INPUT:** `dirHandle`, `currentPath` (string, default "").
2. Init `entries = []`.
3. Init `fileMap = new Map()` (لتسريع البحث عن الصور لاحقاً).
4. **ASYNC ITERATOR** over `dirHandle.values()`:
* For each `entry`:
* Construct `fullPath = currentPath + "/" + entry.name`.
* **IF** `entry.kind === 'file'`:
* Create `node = { id: fullPath, kind: 'file', handle: entry }`.
* Add to `fileMap`: key=`fullPath`, value=`entry`.
* Push `node` to `entries`.


* **ELSE IF** `entry.kind === 'directory'`:
* **RECURSIVE CALL:** `children = await readDirectoryRecursive(entry, fullPath)`.
* Create `node = { id: fullPath, kind: 'dir', handle: entry, children: children.tree }`.
* Push `node` to `entries`.
* Merge returned `children.fileMap` into current `fileMap`.






5. Sort `entries`: Directories first, then Files (Alphabetical).
6. RETURN `{ tree: entries, map: fileMap }`.

#### 3.3 منطق الحفظ الآمن (Safe Save Logic)

**الدالة:** `saveFile(fileHandle, content)`

**Logic Flow:**

1. **TRY:**
* Call `stream = await fileHandle.createWritable()`.
* Call `await stream.write(content)`.
* Call `await stream.close()`.
* Update `Zustand.isDirty = false`.
* Update `lastSavedContent = content`.
* Return `SUCCESS`.


2. **CATCH (Error):**
* **IF** Error contains "Permission":
* Trigger UI Modal: "Permission Lost. Please re-grant access."


* **ELSE**:
* Trigger Toast: "Save Failed: [Error Message]".


* Return `FAILURE`.



---

### 4. 🖼️ الوحدة الثالثة: محلل الصور المحلية (Local Image Resolver)

**المسؤولية:** تحويل المسارات النصية (`./img/pic.png`) داخل ملفات المارك داون إلى روابط `Blob URL` قابلة للعرض.

#### 4.1 خوارزمية البحث والتحويل (Resolution Algorithm)

**المكون:** `useLocalImage(src: string)` Custom Hook.
**الموقع:** `src/hooks/useLocalImage.ts`.

**Logic Flow:**

1. **INPUT:** `src` (String from markdown AST).
2. **STATE:** `[imageUrl, setImageUrl] = useState(null)`.
3. **ACCESS STORE:** Get `fileMap` form Zustand (Map<path, handle>).
4. **EFFECT HOOK:** (Runs when `src` or `fileMap` changes):
* **Step A: Path Normalization (تنظيف المسار):**
* Remove leading `./` if present.
* Example: `./assets/logo.png` -> `assets/logo.png`.


* **Step B: Lookup (البحث):**
* Call `handle = fileMap.get(normalizedPath)`.
* **IF** `handle` is UNDEFINED -> Return (Image stays null/broken).


* **Step C: Blob Creation (إنشاء الكائن):**
* Execute `file = await handle.getFile()`.
* Execute `blobUrl = URL.createObjectURL(file)`.


* **Step D: State Update:**
* Call `setImageUrl(blobUrl)`.


* **Step E: CLEANUP FUNCTION (Critical):**
* **Trigger:** When component unmounts or `src` changes.
* **Action:** Call `URL.revokeObjectURL(blobUrl)`.
* *Why?* To free up browser RAM immediately.




5. **RETURN:** `imageUrl`.

#### 4.2 مكون العرض الذكي (Smart Image Component)

**المكون:** `LocalImageRenderer.tsx`.

**Logic Flow:**

1. Call `url = useLocalImage(props.src)`.
2. **IF** `url` is NULL (Loading/Not Found):
* Show `<Skeleton className="w-full h-48 animate-pulse" />`.


3. **ELSE**:
* Render `<img src={url} onError={handleError} />`.
* **On Error:** Replace with `<div className="border border-red-500">Broken Image: {props.src}</div>`.



---

### 5. 👁️ الوحدة الرابعة: المعاينة والرسم (Preview & Mermaid)

**المسؤولية:** تحويل النص الخام إلى HTML آمن ورسوم بيانية تفاعلية، وتزامن التمرير.

#### 5.1 تكوين Markdown Parser

**الموقع:** `src/components/core/Preview/MarkdownView.tsx`.

**Configuration Object:**

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]} // Support tables, tasklists
  rehypePlugins={[
    rehypeSlug, // Add IDs to headers for linking
    [rehypeSanitize, schema] // Security Layer
  ]}
  components={{
    img: LocalImageRenderer, // Hook our custom image logic
    code: CodeBlockRenderer  // Hook logic for syntax highlight & mermaid
  }}
>
  {content}
</ReactMarkdown>

```

#### 5.2 مكون Mermaid (Mermaid Block Logic)

**المكون:** `MermaidBlock.tsx`.

**Logic Flow:**

1. **EFFECT:**
* Generate unique ID: `id = "m" + uuid()`.
* **TRY:**
* Check `mermaid.parse(code)` (Validation step).
* If valid: `await mermaid.render(id, code)`.
* Set output SVG to state.


* **CATCH:**
* Set error message to state.
* *UI:* Show old SVG (stale) with a small red warning "Syntax Error".





#### 5.3 خوارزمية التمرير المتزامن (Sync Scroll Algorithm)

**الموقع:** `src/components/layout/EditorLayout.tsx`
**الهدف:** تحريك المعاينة تلقائياً عند تحريك المحرر (One-way binding).

**Logic Flow:**

1. **Event Listener:** استماع لحدث `scroll` (أو `update` plugin) من CodeMirror View.
2. **Calculation:**
* Calculate ratio: `editorRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)`.
* Target position: `previewTargetTop = editorRatio * (preview.scrollHeight - preview.clientHeight)`.


3. **Execution:**
* Use `previewRef.current.scrollTo({ top: previewTargetTop, behavior: 'auto' })`.
* *Optimization:* Use `requestAnimationFrame` to prevent layout thrashing and jitter.



---

### 6. 🛡️ الوحدة الخامسة: حماية البيانات (Data Safety Guard)

**المسؤولية:** الحارس الأخير لمنع فقدان العمل.

#### 6.1 منطق Dirty State (تتبع التعديلات)

**الموقع:** `src/store/slices/editorSlice.ts`.

**State Logic:**

* `originalContent`: String (Set on Load/Save).
* `currentContent`: String (Updated on every keystroke).
* **Computed Property (Getter):**
* `isDirty` => `originalContent !== currentContent`.



#### 6.2 معترض الإغلاق (Window Unload Interceptor)

**الموقع:** `src/App.tsx` (Top Level).

**Event Handler Logic:**

```typescript
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    const isDirty = useStore.getState().editor.isDirty;
    
    if (isDirty) {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires this to show dialog
    }
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []);

```

---

### 7. ⏱️ اعتبارات الأداء الحرجة (Critical Performance Considerations)

#### 7.1 الاختناق (Throttling) في الحفظ التلقائي

* **القاعدة:** لا تقم أبداً بتحديث الـ `originalContent` في الـ Store مع كل حرف.
* **التطبيق:** تحديث `currentContent` يتم مع كل حرف (للعرض الفوري)، لكن عمليات الحفظ التلقائي (في IndexedDB) يجب أن تخضع لـ `debounce(1000ms)`، أي الانتظار ثانية بعد توقف الكتابة قبل الحفظ.

#### 7.2 تقسيم الكود (Code Splitting)

* **المكونات الثقيلة:** `Mermaid`, `CodeMirror Languages`, `Shadcn Icons`.
* **التنفيذ:** استخدام `React.lazy()` لتحميل مكون المعاينة:
```typescript
const PreviewPanel = React.lazy(() => import('./PreviewPanel'));

```


هذا يضمن أن تحميل الصفحة الأولى (Landing) سريع جداً (Start-up time < 1.5s).

---

### 🏁 الخاتمة (Final Sign-off)

بهذه الوثيقة (LLD v1.1)، تم تفكيك "الصندوق الأسود" للنظام إلى أجزاء صغيرة جداً وواضحة المنطق. يمكن للمطورين الآن البدء في التنفيذ المباشر دون غموض.
