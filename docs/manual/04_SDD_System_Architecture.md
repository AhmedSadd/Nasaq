# 📄 System Design Document (SDD)
## Project: Nasaq (نسق)
**Version:** 1.2 (Total Control & Media Handling)
**Document ID:** 04_SDD
**Date:** Jan 2026

---

### 1. 🏛️ المعمارية العامة (System Architecture)

يعتمد النظام على نمط معماري **Client-Side Monolith** معزز بتقنيات التخزين المحلي الحديثة. تم تصميم النظام ليعمل كبيئة معزولة (Sandboxed Environment) داخل المتصفح، حيث يتم التعامل مع نظام الملفات عبر واجهة برمجة التطبيقات (FSA API) ويتم إدارة المنطق المعقد (مثل توجيه النص ومعالجة الصور) في الذاكرة الحية (In-Memory).

#### 1.1 المخطط الهيكلي المحدث (Updated High-Level Diagram)

```mermaid
graph TD
    subgraph Client Workstation [جهاز المستخدم]
        Disk[Local Hard Drive]
        Browser[Web Browser]
        
        subgraph App Runtime [Application Logic]
            UI_Layer[React UI (Shadcn)]
            
            subgraph Logic Core
                StateManager[Zustand Store]
                FSA_Adapter[File System Adapter]
                Img_Resolver[Local Image Resolver]
            end
            
            subgraph Editor Engine
                CM6_Core[CodeMirror 6 View]
                Dir_Manager[Direction Manager (Compartment)]
                Auto_RTL[AutoRTL Plugin]
            end
            
            subgraph Preview Engine
                MD_Parser[React Markdown]
                Mermaid_Render[Mermaid Service]
            end
        end
        
        Disk <-->|Read/Write Streams| FSA_Adapter
        FSA_Adapter -->|File Data| StateManager
        FSA_Adapter -->|Blob Data| Img_Resolver
        
        StateManager -->|Config (Dir Mode)| Dir_Manager
        Dir_Manager -->|Toggle| Auto_RTL
        
        UI_Layer -->|User Events| StateManager
        CM6_Core -->|Text Update| MD_Parser
        Img_Resolver -->|Blob URLs| MD_Parser
    end
```

#### 1.2 قرارات التصميم الجوهرية (Key Design Decisions)

1.  **إدارة الاتجاه التفاعلية (Reactive Direction Management):**
    *   **المشكلة:** إعادة بناء المحرر بالكامل (Full Re-mount) عند تغيير الاتجاه يسبب وميضاً وفقدان تركيز المؤشر وموضع التمرير.
    *   **الحل:** استخدام ميزة `Compartment` في CodeMirror 6. هذا يسمح لنا بتغليف إعدادات الاتجاه في "حاوية معزولة" يمكن إعادة تكوينها (Reconfigure) ديناميكياً بقرار من `Zustand` دون التأثير على باقي حالة المحرر.

2.  **معالجة الصور عند الطلب (On-Demand Image Resolution):**
    *   **المشكلة:** تحويل جميع الصور في المجلد إلى `Blob URLs` دفعة واحدة سيستهلك الذاكرة (RAM) بشكل هائل وقد يؤدي لانهيار المتصفح في المجلدات الكبيرة.
    *   **الحل:** (Lazy Resolution). يتم إنشاء الـ `Blob URL` للصورة **فقط** عندما يطلبها مكون المعاينة (أي عندما تكون الصورة مذكورة في النص). ويتم تنظيف هذه الروابط (Revoke) عند إغلاق الملف أو تغيير المجلد.

3.  **فصل طبقة البيانات عن العرض (Data/View Separation):**
    *   يتم الاحتفاظ بـ "شجرة الملفات" (File Tree) ككائن بيانات خالص (Plain Object) في الـ Store، بينما يتم التعامل مع الـ `FileSystemHandles` (التي لا يمكن تخزينها في localStorage) في طبقة منفصلة يتم إعادة تهيئتها عند التحميل.

---

### 2. 🧱 تصميم المكونات (Component Design)

#### 2.1 هيكلية المجلدات المحدثة (Updated Folder Structure)
تمت إضافة مجلدات جديدة لدعم الميزات الإضافية.

```text
src/
├── components/
│   ├── core/
│   │   ├── Editor/            # مكونات المحرر
│   │   │   ├── EditorWrapper.tsx
│   │   │   ├── DirectionToggle.tsx  *NEW*
│   │   │   └── SearchPanel.tsx
│   │   ├── Preview/           # مكونات المعاينة
│   │   │   ├── MarkdownView.tsx
│   │   │   ├── MermaidBlock.tsx
│   │   │   └── ImageResolver.tsx    *NEW*
│   │   └── FileTree/          # شجرة الملفات
│   │       ├── FileItem.tsx
│   │       └── DirectoryItem.tsx
│   ├── ui/                    # Shadcn Components
│   └── layout/                # Resizable Panels
├── hooks/
│   ├── useFileSystem.ts       # منطق الملفات (CRUD)
│   ├── useDirection.ts        # منطق توجيه النص *NEW*
│   ├── useHotkeys.ts          # الاختصارات
│   └── useLocalImage.ts       # جلب الصور *NEW*
├── lib/
│   ├── editor-extensions/
│   │   ├── auto-rtl-plugin.ts # خوارزمية Auto
│   │   └── direction-conf.ts  # إعدادات Compartment *NEW*
│   └── file-utils.ts
├── store/
│   ├── useAppStore.ts         # المجمع الرئيسي
│   ├── slices/                # تقسيم الحالة
│   │   ├── editorSlice.ts
│   │   ├── fileSlice.ts
│   │   └── settingsSlice.ts
└── App.tsx
```

#### 2.2 تفصيل المكونات الجديدة

**أ. مكون مبدل الاتجاه (DirectionToggle Component)**
*   **المسؤولية:** واجهة المستخدم للتحكم في `DirectionMode`.
*   **السلوك:**
    *   يعرض الأيقونة الحالية (Auto/RTL/LTR).
    *   عند النقر: يغير القيمة في `SettingsSlice`.
    *   يستمع للاختصار `Alt+Shift+D` لتدوير القيم.

**ب. مكون محلل الصور (ImageResolver Component)**
*   **المسؤولية:** مكون مخصص داخل `ReactMarkdown` بديل لوسم `img`.
*   **المدخلات (Props):** `src` (المسار النسبي)، `alt`.
*   **المنطق الداخلي:**
    1.  يستخدم `useLocalImage(src)` Hook.
    2.  الـ Hook يبحث عن الملف، يحوله لـ Blob، ويعيد URL.
    3.  أثناء التحميل يعرض `Skeleton`.
    4.  عند الخطأ يعرض `BrokenIcon`.

---

### 3. 💾 تصميم البيانات (Data Design)

#### 3.1 تحديث نموذج الحالة (Store Schema Update)
تم توسيع الحالة لدعم الإعدادات الجديدة.

```typescript
// Types
type DirectionMode = 'auto' | 'rtl' | 'ltr';

interface SettingsSlice {
  directionMode: DirectionMode; // الحالة الحالية
  toggleDirection: () => void;  // دالة التدوير
  setDirection: (mode: DirectionMode) => void;
}

interface EditorSlice {
  // ... (content, isDirty)
  // لا نحتاج لتخزين الاتجاه هنا لأنه "إعداد" وليس "محتوى"
}

interface FileSystemSlice {
  // ... (handles)
  // Lookup map لتسريع البحث عن الصور
  fileMap: Map<string, FileSystemFileHandle>; 
}
```

#### 3.2 استراتيجية البحث عن الصور (Image Lookup Strategy)
لتحسين أداء البحث عن الصور (`O(1)` بدلاً من `O(n)`):
*   عند فتح مجلد وقراءة شجرة الملفات، نقوم ببناء `Flat Map` مسطحة في الذاكرة:
    *   **Key:** المسار النسبي (e.g., `assets/logo.png`).
    *   **Value:** الـ `FileSystemFileHandle`.
*   هذا يسمح لمكون الصورة بالوصول للملف فوراً دون الحاجة للمرور عبر الشجرة التكرارية في كل مرة.

---

### 4. 🔌 تصميم الواجهات الداخلية (Internal API Design)

#### 4.1 واجهة إدارة الاتجاه (Direction Logic API)
تم تصميم هذا الجزء ليكون قابلاً للتوسع (Extensible).

**ملف `lib/editor-extensions/direction-conf.ts`:**
```typescript
import { Compartment } from '@codemirror/state';

// 1. إنشاء الحاوية المعزولة
export const directionCompartment = new Compartment();

// 2. دالة توليد الإعدادات حسب الوضع
export function getDirectionExtension(mode: DirectionMode) {
  switch (mode) {
    case 'rtl':
      return [EditorView.contentAttributes.of({ dir: 'rtl' })]; // Force RTL
    case 'ltr':
      return [EditorView.contentAttributes.of({ dir: 'ltr' })]; // Force LTR
    case 'auto':
    default:
      return [
        EditorView.contentAttributes.of({ dir: 'auto' }), 
        autoRTLPlugin // تفعيل الخوارزمية المكلفة فقط هنا
      ];
  }
}
```

#### 4.2 واجهة هوك الصور (useLocalImage Hook)
```typescript
function useLocalImage(relativePath: string) {
  const [url, setUrl] = useState<string | null>(null);
  const fileMap = useStore(s => s.fileMap);

  useEffect(() => {
    let active = true;
    
    async function load() {
      // 1. تنظيف المسار (إزالة ./ أو / في البداية)
      const cleanPath = normalizePath(relativePath);
      
      // 2. البحث في الـ Map
      const handle = fileMap.get(cleanPath);
      if (!handle) return;

      // 3. التحويل
      const file = await handle.getFile();
      const objectUrl = URL.createObjectURL(file);
      
      if (active) setUrl(objectUrl);
      
      // 4. Cleanup function (مهم جداً للذاكرة)
      return () => URL.revokeObjectURL(objectUrl);
    }

    load();
    return () => { active = false; };
  }, [relativePath, fileMap]);

  return url;
}
```

---

### 5. 🛡️ البنية التحتية والأمان (Infrastructure & Security)

#### 5.1 معالجة الـ Blob Security
*   **الخطر:** الـ Blob URLs قد تستهلك الذاكرة إذا لم يتم التخلص منها.
*   **الحل:** استخدام `useEffect` cleanup function في مكون الصور لضمان استدعاء `revokeObjectURL` بمجرد اختفاء الصورة من الشاشة أو تغيير الملف.

#### 5.2 التحقق من المسارات (Path Traversal)
*   **الخطر:** محاولة الوصول لملفات خارج المجلد المسموح (e.g., `../../windows/system32`).
*   **الحل:** المتصفح (FSA API) يمنع هذا افتراضياً (Sandboxed). ومع ذلك، يجب في دالة `normalizePath` منع أي مسار يبدأ بـ `..` كإجراء احترازي إضافي داخل منطق التطبيق.

---

### 6. 🧜 مخططات Mermaid والتكامل (Mermaid Integration)

#### 6.1 استراتيجية التصيير (Rendering Strategy)
رسم المخططات عملية "ثقيلة" حسابياً. لجعل المحرر سريعاً، يجب فصل عملية الرسم عن تدفق الكتابة الرئيسي.

*   **المكتبة:** استخدام `mermaid` (Browser Bundle).
*   **التهيئة (Initialization):**
    *   يتم استدعاء `mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })` مرة واحدة عند بدء التطبيق.
    *   يجب ربط ثيم Mermaid بثيم التطبيق (Shadcn/UI Theme) لضمان التناسق البصري.

#### 6.2 مكون MermaidBlock (التفاصيل الدقيقة)
```typescript
// Logic Flow for MermaidBlock Component
useEffect(() => {
  // 1. Unique ID Generation
  const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
  
  // 2. Async Rendering
  mermaid.render(id, code)
    .then(({ svg }) => {
      setSvgContent(svg);
      setError(null);
    })
    .catch((err) => {
      // 3. Graceful Error Handling
      // Mermaid يرمي خطأً عند وجود Syntax Error أثناء الكتابة
      // لا نريد إزعاج المستخدم، لذا نعرض نص الخطأ بشكل بسيط
      setError(err.message); 
      // هام: يجب إعادة تعيين Mermaid لمنع توقفه عن العمل بعد الخطأ
      // (Mermaid quirks require clearing error state)
    });
}, [code, theme]);
```
---

### 7. 🚀 خطة التنفيذ المحدثة (Updated Implementation Roadmap)

تم تحديث الخطة لتعكس الأولويات الجديدة (الاتجاه والصور).

#### Sprint 1: الأساسيات والهيكل (Foundation)
*   إعداد المشروع + Shadcn UI.
*   بناء الـ Layout القابل للسحب (Resizable Panels).
*   بناء الـ File System Adapter الأساسي.

#### Sprint 2: المحرر والتحكم الكامل (The Editor & Control)
*   دمج CodeMirror 6.
*   **تنفيذ Direction Logic (Compartments + AutoRTL Plugin).**
*   **بناء واجهة Direction Toggle والاختصارات (`Alt+Shift+D`).**

#### Sprint 3: إدارة الملفات المتقدمة (Files & Media)
*   تنفيذ CRUD (إنشاء/حذف).
*   **تنفيذ Image Resolver Hook وبناء الـ File Map.**
*   تنفيذ الحفظ المباشر (Native Save).

#### Sprint 4: المعاينة والجودة (Preview & QA)
*   دمج React Markdown + Mermaid.
*   تطبيق الـ Sync Scroll.
*   اختبارات شاملة (E2E Testing) لسيناريوهات الاتجاه والصور.
*   النشر على GitHub Pages.

---

### 8. ⚠️ المخاطر واستراتيجيات التخفيف (Risks & Mitigation)

| الخطر (Risk) | الأثر (Impact) | استراتيجية التخفيف (Mitigation) |
| :--- | :--- | :--- |
| **بطء المحرر مع AutoRTL** | تأخر في الكتابة (Lag) في الملفات الضخمة. | قصر عمل الـ Regex على "الأسطر المرئية" فقط (Viewport Only) باستخدام `RangeSetBuilder`. |
| **تسرب الذاكرة من الصور** | المتصفح يستهلك RAM عالية ويصبح بطيئاً. | تطبيق صارم لـ `URL.revokeObjectURL` في `useEffect cleanup`، واستخدام Lazy Loading للصور. |
| **تعارض الاختصارات** | `Alt+Shift+D` قد يتعارض مع إضافات المتصفح. | توفير إمكانية (مستقبلاً) للمستخدم لتعديل الاختصارات في ملف `settings.json`. حالياً، استخدام اختصار مركب ومعقد يقلل الاحتمالية. |
| **فقدان حالة الاتجاه** | المستخدم يضطر لضبط الاتجاه كل مرة يفتح التطبيق. | حفظ الإعدادات في `localStorage` واستعادتها فور تحميل التطبيق (Hydration). |

---

### 🏁 الخاتمة (Conclusion)
تحدد هذه الوثيقة (SDD v1.2) البنية الهندسية الكاملة لمشروع "Nasaq" بميزاته المتقدمة.
*   **الواجهة:** مرنة وقابلة للتخصيص.
*   **المحرك:** ذكي ويدعم التحكم الكامل.
*   **البيانات:** آمنة وتعمل بشكل محلي 100%.
