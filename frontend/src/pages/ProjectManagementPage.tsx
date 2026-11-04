import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  House,
  FolderSearch,
  CirclePlus,
  Bookmark,
  Heart,
  UserRound,
  Sprout,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ImagePlus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Layers3,
  CalendarDays,
  LockKeyhole,
  Package,
  Images,
  FileText,
  X,
  Save,
  Plus,
} from 'lucide-react'

import Logo from '../components/Logo'
import './MyProjectsPage.css'
import './ProjectManagementPage.css'

const API_URL = 'http://localhost:5000/api'

type Category = {
  id: string
  name: string
}

type StepMaterial = {
  id: string
  quantityNeeded: number | string
  quantityUsed: number | string
  material: {
    id: string
    name: string
    unit: string
  }
}

type StepMaterialDraft = {
  materialId: string
  quantityNeeded: string
}

type ProjectStep = {
  id: string
  title: string
  description: string
  imagePath: string | null
  stepNumber: number
  materialsUsed: StepMaterial[]
}

type ProjectGalleryImage = {
  id: string
  imagePath: string
  caption: string | null
  sortOrder: number
}

type ProjectMaterial = {
  id: string
  name: string
  unit: string
  quantityAvailable: number | string
  notes: string | null
}

type Project = {
  id: string
  title: string
  description: string
  imagePath: string | null
  isPublished: boolean
  completedAt: string | null
  isGalleryPublic: boolean
  categoryId: string | null
  createdAt: string
  updatedAt: string
  category: Category | null
  steps: ProjectStep[]
  materials: ProjectMaterial[]
  galleryImages: ProjectGalleryImage[]
  _count?: {
    steps: number
  }
}

type EditorTab = 'steps' | 'details' | 'materials' | 'gallery'

type ApiResponse<T> = {
  project: T
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('lv-LV', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Vienību tipi, kuru daudzumu uzskaita tikai veselos skaitļos.
// Piemēram: gab. = 1, 2, 3; kg un m = 0,01; 0,02; 0,03.
function usesWholeMaterialUnits(unit: string) {
  const normalized = unit.trim().toLocaleLowerCase('lv-LV').replace(/\.$/, '')

  return [
    'gab',
    'gb',
    'pcs',
    'pc',
    'kom',
    'kompl',
    'komplekts',
    'komplekti',
    'vien',
    'vieniba',
    'vienības',
    'paris',
    'pāris',
  ].includes(normalized)
}

function isValidAmountForUnit(
  amount: number,
  unit: string,
  allowZero = false,
) {
  if (!Number.isFinite(amount)) return false
  if (allowZero ? amount < 0 : amount <= 0) return false

  if (usesWholeMaterialUnits(unit)) {
    return Number.isInteger(amount)
  }

  // Datubāze materiālu daudzumiem atbalsta ne vairāk kā 2 zīmes aiz komata.
  return Math.abs(amount * 100 - Math.round(amount * 100)) < 0.0000001
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('lv-LV', {
    maximumFractionDigits: 2,
  }).format(value)
}

type MaterialBalanceSummary = {
  materialId: string
  materialName: string
  unit: string
  available: number
  totalNeeded: number
  totalUsed: number
  remainingNeeded: number
  shortage: number
}

function getMaterialBalanceSummaries(project: Project): MaterialBalanceSummary[] {
  return project.materials.map((material) => {
    const assignments = project.steps.flatMap((step) =>
      step.materialsUsed.filter(
        (assignment) => assignment.material.id === material.id,
      ),
    )

    const totalNeeded = assignments.reduce(
      (sum, assignment) => sum + Number(assignment.quantityNeeded),
      0,
    )

    const totalUsed = assignments.reduce(
      (sum, assignment) => sum + Number(assignment.quantityUsed),
      0,
    )

    // Pieejamais atlikums jau ir samazināts par izlietoto daudzumu,
    // tāpēc salīdzinām to tikai ar vēl neizlietoto nepieciešamo daudzumu.
    const remainingNeeded = Math.max(0, totalNeeded - totalUsed)
    const available = Math.max(0, Number(material.quantityAvailable) || 0)
    const shortage = Math.max(0, remainingNeeded - available)

    return {
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      available,
      totalNeeded,
      totalUsed,
      remainingNeeded,
      shortage,
    }
  })
}

function ProjectImage({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  const [imageUrl, setImageUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''

    setImageUrl('')
    setFailed(false)

    fetch(src, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Attēlu neizdevās ielādēt.')
        }

        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setImageUrl(objectUrl)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true)
        }
      })

    return () => {
      controller.abort()

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [src])

  if (failed) {
    return (
      <div className={`editor-image-fallback ${className}`}>
        <Sprout size={35} strokeWidth={1.3} />
        <span>Attēlu neizdevās ielādēt</span>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className={`editor-image-fallback ${className}`}>
        <span className="editor-image-loading" />
      </div>
    )
  }

  return (
    <img
      className={className}
      src={imageUrl}
      alt={alt}
    />
  )
}

function ProjectManagementPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const [activeTab, setActiveTab] = useState<EditorTab>('steps')

  // Soļa pievienošana un rediģēšana
  const [stepFormOpen, setStepFormOpen] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [stepTitle, setStepTitle] = useState('')
  const [stepDescription, setStepDescription] = useState('')
  const [stepMaterialDrafts, setStepMaterialDrafts] = useState<
    StepMaterialDraft[]
  >([])

  const [stepImageFile, setStepImageFile] = useState<File | null>(null)

  // Projekta pamatinformācijas forma
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')

  // Projekta materiālu pievienošana un rediģēšana
  const [materialFormOpen, setMaterialFormOpen] = useState(false)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [materialName, setMaterialName] = useState('')
  const [materialUnit, setMaterialUnit] = useState('gab.')
  const [materialQuantity, setMaterialQuantity] = useState('0')
  const [materialNotes, setMaterialNotes] = useState('')
  const [restockValues, setRestockValues] = useState<Record<string, string>>({})

  const apiRequest = useCallback(
    async <T,>(
      path: string,
      options: RequestInit = {},
    ): Promise<T> => {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        navigate('/login', { replace: true })
        throw new Error('Tava sesija ir beigusies. Lūdzu, piesakies vēlreiz.')
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Neizdevās izpildīt pieprasījumu.',
        )
      }

      return data as T
    },
    [navigate],
  )

  const refreshProject = useCallback(async () => {
    if (!id) return null

    const data = await apiRequest<ApiResponse<Project>>(
      `/projects/${id}/manage`,
    )

    setProject(data.project)

    return data.project
  }, [id, apiRequest])

  const loadProject = useCallback(async () => {
    if (!id) {
      setError('Nav norādīts projekta ID.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiRequest<ApiResponse<Project>>(
        `/projects/${id}/manage`,
      )

      setProject(data.project)
      setProjectTitle(data.project.title)
      setProjectDescription(data.project.description)
      setCategoryId(data.project.categoryId ?? '')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neizdevās ielādēt projektu.',
      )
    } finally {
      setLoading(false)
    }
  }, [id, apiRequest])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  useEffect(() => {
    let active = true

    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/categories`, {
          credentials: 'include',
        })

        if (!response.ok) return

        const data = await response.json()

        if (active && Array.isArray(data.categories)) {
          setCategories(data.categories)
        }
      } catch {
        // Kategorijas nav kritiskas projekta lapas ielādei.
      }
    }

    void loadCategories()

    return () => {
      active = false
    }
  }, [])

  function showSuccess(message: string) {
    setNotice(message)
    setError('')
  }

  function showError(err: unknown) {
    setError(
      err instanceof Error
        ? err.message
        : 'Radās neparedzēta kļūda.',
    )
    setNotice('')
  }

  // =====================================================
  // PROJEKTA REDZAMĪBA UN PABEIGŠANA
  // =====================================================

  async function toggleProjectVisibility() {
    if (!project) return

    const nextVisibility = !project.isPublished

    const confirmed = window.confirm(
      nextVisibility
        ? 'Vai tiešām vēlies publicēt šo projektu?'
        : 'Vai vēlies padarīt projektu privātu?',
    )

    if (!confirmed) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/projects/${project.id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: nextVisibility,
        }),
      })

      await refreshProject()

      showSuccess(
        nextVisibility
          ? 'Projekts veiksmīgi publicēts!'
          : 'Projekts tagad ir privāts.',
      )
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function toggleCompletion() {
    if (!project) return

    const completed = !project.completedAt

    const confirmed = window.confirm(
      completed
        ? 'Vai vēlies atzīmēt projektu kā pabeigtu?'
        : 'Vai vēlies atgriezt projektu statusā Procesā?',
    )

    if (!confirmed) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/projects/${project.id}/completion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      })

      await refreshProject()

      showSuccess(
        completed
          ? 'Projekts atzīmēts kā pabeigts!'
          : 'Projekts atgriezts statusā Procesā.',
      )
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  // =====================================================
  // PROJEKTA SOĻI
  // =====================================================

  async function saveStepMaterialAssignments(stepId: string) {
    const existingStep = project?.steps.find(
      (step) => step.id === stepId,
    )

    const existingAssignments = existingStep?.materialsUsed ?? []

    // Atjaunojam vai noņemam jau esošās materiālu piesaistes.
    for (const assignment of existingAssignments) {
      const selectedMaterial = stepMaterialDrafts.find(
        (item) => item.materialId === assignment.material.id,
      )

      if (!selectedMaterial) {
        await apiRequest(
          `/materials/assignments/${assignment.id}`,
          {
            method: 'DELETE',
          },
        )

        continue
      }

      const newQuantity = Number(selectedMaterial.quantityNeeded)

      if (newQuantity !== Number(assignment.quantityNeeded)) {
        await apiRequest(
          `/materials/assignments/${assignment.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quantityNeeded: newQuantity,
            }),
          },
        )
      }
    }

    // Pievienojam jaunās materiālu piesaistes.
    for (const selectedMaterial of stepMaterialDrafts) {
      const alreadyAssigned = existingAssignments.some(
        (item) =>
          item.material.id === selectedMaterial.materialId,
      )

      if (!alreadyAssigned) {
        await apiRequest(
          `/materials/steps/${stepId}/assignments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              materialId: selectedMaterial.materialId,
              quantityNeeded: Number(
                selectedMaterial.quantityNeeded,
              ),
            }),
          },
        )
      }
    }
  }

  function openNewStepForm() {
    setEditingStepId(null)
    setStepTitle('')
    setStepDescription('')
    setStepMaterialDrafts([])
    setStepImageFile(null)
    setStepFormOpen(true)
  }

  function openEditStepForm(step: ProjectStep) {
    setEditingStepId(step.id)
    setStepTitle(step.title)
    setStepDescription(step.description)

    setStepMaterialDrafts(
      step.materialsUsed.map((item) => ({
        materialId: item.material.id,
        quantityNeeded: String(item.quantityNeeded),
      })),
    )

    setStepImageFile(null)
    setStepFormOpen(true)
  }

  function closeStepForm() {
    setStepFormOpen(false)
    setEditingStepId(null)
    setStepTitle('')
    setStepDescription('')
    setStepMaterialDrafts([])
    setStepImageFile(null)
  }

  function addStepMaterialDraft() {
    if (!project || project.materials.length === 0) {
      showError(
        new Error(
          'Vispirms pievieno materiālus projekta sadaļā Materiāli.',
        ),
      )
      return
    }

    const availableMaterial = project.materials.find(
      (material) =>
        !stepMaterialDrafts.some(
          (item) => item.materialId === material.id,
        ),
    )

    if (!availableMaterial) {
      showError(new Error('Visi projekta materiāli jau ir izvēlēti.'))
      return
    }

    setStepMaterialDrafts((current) => [
      ...current,
      {
        materialId: availableMaterial.id,
        quantityNeeded: '1',
      },
    ])

    setError('')
  }

  function updateStepMaterialDraft(
    index: number,
    changes: Partial<StepMaterialDraft>,
  ) {
    setStepMaterialDrafts((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    )
  }

  function removeStepMaterialDraft(index: number) {
    setStepMaterialDrafts((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  async function saveStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || !stepTitle.trim() || !stepDescription.trim()) {
      return
    }

    const invalidMaterial = stepMaterialDrafts.some((item) => {
      const quantity = Number(item.quantityNeeded)
      const material = project.materials.find(
        (entry) => entry.id === item.materialId,
      )

      return (
        !item.materialId ||
        !material ||
        !isValidAmountForUnit(quantity, material.unit)
      )
    })

    if (invalidMaterial) {
      showError(
        new Error(
          'Pārbaudi izvēlētos materiālus un to nepieciešamo daudzumu.',
        ),
      )
      return
    }

    if (
      stepImageFile &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(
        stepImageFile.type,
      )
    ) {
      showError(
        new Error('Atļauti tikai JPG, PNG un WEBP attēli.'),
      )
      return
    }

    if (stepImageFile && stepImageFile.size > 5 * 1024 * 1024) {
      showError(
        new Error('Attēla izmērs nedrīkst pārsniegt 5 MB.'),
      )
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      let savedStepId: string | null = editingStepId

      if (editingStepId) {
        await apiRequest(
          `/projects/${project.id}/steps/${editingStepId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: stepTitle.trim(),
              description: stepDescription.trim(),
            }),
          },
        )
      } else {
        const previousStepIds = new Set(
          project.steps.map((step) => step.id),
        )

        await apiRequest(`/projects/${project.id}/steps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: stepTitle.trim(),
            description: stepDescription.trim(),
          }),
        })

        const updatedProject = await refreshProject()

        const createdStep = updatedProject?.steps.find(
          (step) => !previousStepIds.has(step.id),
        )

        if (!createdStep) {
          throw new Error(
            'Solis tika izveidots, bet neizdevās to atrast. Atjauno lapu un pārbaudi projekta soļus.',
          )
        }

        savedStepId = createdStep.id
      }

      if (!savedStepId) {
        throw new Error('Neizdevās noteikt projekta soļa ID.')
      }

      // Saglabājam materiālu piesaistes.
      await saveStepMaterialAssignments(savedStepId)

      // Ja izvēlēts attēls, augšupielādējam to šim solim.
      if (stepImageFile) {
        const formData = new FormData()
        formData.append('image', stepImageFile)

        await apiRequest(`/images/steps/${savedStepId}`, {
          method: 'POST',
          body: formData,
        })
      }

      await refreshProject()

      closeStepForm()

      showSuccess(
        editingStepId
          ? 'Projekta solis veiksmīgi atjaunots.'
          : 'Jauns projekta solis veiksmīgi pievienots.',
      )
    } catch (err) {
      showError(err)
      await refreshProject()
    } finally {
      setBusy(false)
    }
  }

  async function deleteStep(step: ProjectStep) {
    if (!project) return

    const confirmed = window.confirm(
      `Vai tiešām vēlies dzēst soli "${step.title}"?`,
    )

    if (!confirmed) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/projects/${project.id}/steps/${step.id}`,
        {
          method: 'DELETE',
        },
      )

      await refreshProject()
      showSuccess('Projekta solis veiksmīgi izdzēsts.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function moveStep(stepIndex: number, direction: -1 | 1) {
    if (!project) return

    const nextIndex = stepIndex + direction

    if (nextIndex < 0 || nextIndex >= project.steps.length) {
      return
    }

    const reorderedSteps = [...project.steps]

    const [movedStep] = reorderedSteps.splice(stepIndex, 1)
    reorderedSteps.splice(nextIndex, 0, movedStep)

    setBusy(true)
    setError('')

    try {
      await apiRequest(`/projects/${project.id}/steps/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepIds: reorderedSteps.map((step) => step.id),
        }),
      })

      await refreshProject()
      showSuccess('Soļu secība veiksmīgi atjaunota.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function uploadStepImage(stepId: string, file: File) {
    if (!project) return

    const formData = new FormData()
    formData.append('image', file)

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/images/steps/${stepId}`,
        {
          method: 'POST',
          body: formData,
        },
      )

      await refreshProject()
      showSuccess('Soļa attēls veiksmīgi pievienots.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function deleteStepImage(step: ProjectStep) {
    if (!project || !step.imagePath) return

    if (!window.confirm('Vai vēlies noņemt šī soļa attēlu?')) {
      return
    }

    setBusy(true)

    try {
      await apiRequest(`/images/steps/${step.id}`, {
        method: 'DELETE',
      })

      await refreshProject()
      showSuccess('Soļa attēls noņemts.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  // =====================================================
  // PROJEKTA PAMATINFORMĀCIJA
  // =====================================================

  async function saveProjectInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          categoryId: categoryId || null,
        }),
      })

      await refreshProject()
      showSuccess('Projekta informācija veiksmīgi saglabāta.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  // =====================================================
  // PROJEKTA MATERIĀLI
  // =====================================================

  function openNewMaterialForm() {
    setEditingMaterialId(null)
    setMaterialName('')
    setMaterialUnit('gab.')
    setMaterialQuantity('0')
    setMaterialNotes('')
    setMaterialFormOpen(true)
  }

  function openEditMaterialForm(material: ProjectMaterial) {
    setEditingMaterialId(material.id)
    setMaterialName(material.name)
    setMaterialUnit(material.unit)
    setMaterialQuantity('0')
    setMaterialNotes(material.notes ?? '')
    setMaterialFormOpen(true)
  }

  function closeMaterialForm() {
    setMaterialFormOpen(false)
    setEditingMaterialId(null)
    setMaterialName('')
    setMaterialUnit('gab.')
    setMaterialQuantity('0')
    setMaterialNotes('')
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project) return

    const name = materialName.trim()
    const unit = materialUnit.trim()
    const quantity = Number(materialQuantity)

    if (!name || !unit) {
      showError(new Error('Norādi materiāla nosaukumu un mērvienību.'))
      return
    }

    if (!editingMaterialId && !isValidAmountForUnit(quantity, unit, true)) {
      showError(
        new Error(
          usesWholeMaterialUnits(unit)
            ? 'Šīs mērvienības daudzumam jābūt veselam skaitlim.'
            : 'Norādi derīgu daudzumu ar ne vairāk kā 2 zīmēm aiz komata.',
        ),
      )
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (editingMaterialId) {
        await apiRequest(`/materials/${editingMaterialId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            unit,
            notes: materialNotes.trim() || null,
          }),
        })

        showSuccess('Materiāla informācija veiksmīgi atjaunota.')
      } else {
        await apiRequest(`/materials/projects/${project.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            unit,
            quantityAvailable: quantity,
            notes: materialNotes.trim() || null,
          }),
        })

        showSuccess('Materiāls veiksmīgi pievienots projektam.')
      }

      closeMaterialForm()
      await refreshProject()
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function restockMaterial(material: ProjectMaterial) {
    const quantity = Number(restockValues[material.id] ?? '')
    const wholeUnit = usesWholeMaterialUnits(material.unit)

    if (!isValidAmountForUnit(quantity, material.unit)) {
      showError(
        new Error(
          wholeUnit
            ? 'Papildināšanas daudzumam jābūt veselam skaitlim, sākot no 1.'
            : 'Papildināšanas daudzumam jābūt lielākam par 0 un ar ne vairāk kā 2 zīmēm aiz komata.',
        ),
      )
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/materials/${material.id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      })

      setRestockValues((current) => ({
        ...current,
        [material.id]: '',
      }))

      await refreshProject()
      showSuccess(`Materiāla "${material.name}" atlikums papildināts.`)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function deleteMaterial(material: ProjectMaterial) {
    if (!project) return

    const linkedSteps = project.steps.filter((step) =>
      step.materialsUsed.some(
        (item) => item.material.id === material.id,
      ),
    )

    if (linkedSteps.length > 0) {
      showError(
        new Error(
          'Šis materiāls ir piesaistīts projekta soļiem. Vispirms noņem to no šiem soļiem.',
        ),
      )
      return
    }

    const confirmed = window.confirm(
      `Vai tiešām vēlies dzēst materiālu "${material.name}"?`,
    )

    if (!confirmed) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/materials/${material.id}`, {
        method: 'DELETE',
      })

      await refreshProject()
      showSuccess('Materiāls veiksmīgi izdzēsts.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  function getMaterialLinkedSteps(materialId: string) {
    if (!project) return []

    return project.steps.filter((step) =>
      step.materialsUsed.some(
        (item) => item.material.id === materialId,
      ),
    )
  }

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    if (!project) return

    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    setBusy(true)
    setError('')

    try {
      await apiRequest(`/images/projects/${project.id}/cover`, {
        method: 'POST',
        body: formData,
      })

      await refreshProject()
      showSuccess('Projekta titulbilde veiksmīgi atjaunota.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  async function deleteCover() {
    if (!project || !project.imagePath) return

    if (!window.confirm('Vai vēlies noņemt projekta titulbildi?')) {
      return
    }

    setBusy(true)

    try {
      await apiRequest(`/images/projects/${project.id}/cover`, {
        method: 'DELETE',
      })

      await refreshProject()
      showSuccess('Projekta titulbilde noņemta.')
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const coverUrl =
    project?.imagePath && project.id
      ? `${API_URL}/images/projects/${project.id}/cover`
      : null

  if (loading) {
    return (
      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="workspace-logo">
            <Logo />
          </div>
        </aside>

        <main className="workspace-main">
          <div className="editor-loading">
            <span className="workspace-spinner" />
            <p>Ielādējam projekta darbnīcu...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="workspace-logo">
            <Logo />
          </div>
        </aside>

        <main className="workspace-main">
          <div className="editor-load-error">
            <h2>Projektu neizdevās atvērt</h2>
            <p>{error}</p>

            <button onClick={() => navigate('/projects/mine')}>
              Atpakaļ uz maniem projektiem
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!project) return null

  const isCompleted = Boolean(project.completedAt)
  const materialBalanceSummaries = getMaterialBalanceSummaries(project)
  const materialShortages = materialBalanceSummaries.filter(
    (summary) => summary.shortage > 0,
  )

  const tabs: {
    id: EditorTab
    label: string
    icon: typeof Layers3
  }[] = [
    { id: 'steps', label: 'Projekta soļi', icon: Layers3 },
    { id: 'details', label: 'Pamata informācija', icon: FileText },
    { id: 'materials', label: 'Materiāli', icon: Package },
    { id: 'gallery', label: 'Galerija', icon: Images },
  ]

  return (
    <div className="workspace-shell">
      {/* KREISĀ NAVIGĀCIJA */}
      <aside className="workspace-sidebar">
        <div className="workspace-logo">
          <Logo />
        </div>

        <nav
          className="workspace-navigation"
          aria-label="Lietotāja navigācija"
        >
          <button
            className="workspace-nav-link"
            onClick={() => navigate('/dashboard')}
          >
            <House />
            <span>Sākums</span>
          </button>

          <button
            className="workspace-nav-link"
            onClick={() => navigate('/projects')}
          >
            <FolderSearch />
            <span>Projektu katalogs</span>
          </button>

          <button
            className="workspace-nav-link"
            onClick={() => navigate('/projects/new')}
          >
            <CirclePlus />
            <span>Izveidot projektu</span>
          </button>

          <button
            className="workspace-nav-link active"
            onClick={() => navigate('/projects/mine')}
          >
            <Bookmark />
            <span>Mani projekti</span>
          </button>

          <button
            className="workspace-nav-link"
            onClick={() => navigate('/projects/saved')}
          >
            <Heart />
            <span>Saglabātie</span>
          </button>

          <button
            className="workspace-nav-link"
            onClick={() => showSuccess('Profila sadaļu pievienosim vēlāk.')}
          >
            <UserRound />
            <span>Profils</span>
          </button>
        </nav>

        <div className="workspace-sidebar-bottom">
          <div className="workspace-sidebar-decoration">
            <Sprout size={27} strokeWidth={1.4} />
            <p>
              RADI.
              <br />
              MĀCIES.
              <br />
              DALIES.
            </p>
          </div>

          <button
            className="workspace-home-button"
            onClick={() => navigate('/dashboard')}
          >
            <House size={18} />
            Atpakaļ uz sākumu
          </button>
        </div>
      </aside>

      {/* GALVENĀ DAĻA */}
      <main className="workspace-main">
        <div className="project-editor-content">
          {/* PROJEKTA GALVENE */}
          <section className="editor-project-header">
            <div className="editor-project-heading">
              <span className="workspace-eyebrow">
                TAVA RADOŠĀ DARBNĪCA
              </span>

              <h1>{project.title}</h1>

              <p>{project.description || 'Projektam vēl nav apraksta.'}</p>

              <div className="editor-project-badges">
                <span
                  className={
                    project.isPublished
                      ? 'editor-badge badge-public'
                      : 'editor-badge badge-private'
                  }
                >
                  {project.isPublished ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} />
                  )}

                  {project.isPublished ? 'Publisks projekts' : 'Privāts projekts'}
                </span>

                <span
                  className={
                    isCompleted
                      ? 'editor-badge badge-completed'
                      : 'editor-badge badge-progress'
                  }
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Circle size={14} />
                  )}

                  {isCompleted ? 'Pabeigts' : 'Procesā'}
                </span>
              </div>
            </div>

            <div className="editor-cover-frame">
              {coverUrl ? (
                <ProjectImage
                  src={coverUrl}
                  alt={project.title}
                  className="editor-cover-image"
                />
              ) : (
                <div className="editor-cover-empty">
                  <Sprout size={54} strokeWidth={1.2} />
                  <span>Projekta titulbilde</span>
                </div>
              )}
            </div>
          </section>

          {/* PAZIŅOJUMI */}
          {notice && (
            <div className="editor-notice" role="status">
              <CheckCircle2 size={18} />
              <span>{notice}</span>

              <button
                type="button"
                onClick={() => setNotice('')}
                aria-label="Aizvērt paziņojumu"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {error && (
            <div className="editor-error" role="alert">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Aizvērt kļūdas paziņojumu"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* GALVENĀS SADAĻAS */}
          <div className="editor-layout">
            <div className="editor-main-column">
              <div className="editor-tabs" role="tablist">
                {tabs.map((tab) => {
                  const Icon = tab.icon

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={
                        activeTab === tab.id
                          ? 'editor-tab active'
                          : 'editor-tab'
                      }
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={17} />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* ========================================
                  PROJEKTA SOĻI
              ======================================== */}
              {activeTab === 'steps' && (
                <section className="editor-section">
                  <div className="editor-section-heading">
                    <div>
                      <span className="workspace-eyebrow">
                        DARBA PROCESS
                      </span>

                      <h2>Projekta soļi</h2>

                      <p>
                        Dokumentē projekta tapšanu soli pa solim.
                        Pievieno aprakstus, attēlus un nepieciešamos materiālus.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="editor-primary-button"
                      onClick={openNewStepForm}
                    >
                      <Plus size={17} />
                      Pievienot soli
                    </button>
                  </div>

                  {stepFormOpen && (
                    <form
                      className="editor-step-form"
                      onSubmit={saveStep}
                    >
                      <div className="editor-form-heading">
                        <div>
                          <span className="workspace-eyebrow">
                            {editingStepId ? 'SOĻA REDIĢĒŠANA' : 'JAUNS SOLIS'}
                          </span>

                          <h3>
                            {editingStepId
                              ? 'Rediģēt projekta soli'
                              : 'Pievienot jaunu soli'}
                          </h3>
                        </div>

                        <button
                          type="button"
                          className="editor-icon-button"
                          onClick={closeStepForm}
                          aria-label="Aizvērt formu"
                        >
                          <X size={19} />
                        </button>
                      </div>

                      <label className="editor-field">
                        <span>Soļa nosaukums</span>

                        <input
                          type="text"
                          value={stepTitle}
                          onChange={(event) =>
                            setStepTitle(event.target.value)
                          }
                          placeholder="Piemēram, sagatavot koka detaļas"
                          required
                          maxLength={150}
                        />
                      </label>

                      <label className="editor-field">
                        <span>Soļa apraksts</span>

                        <textarea
                          value={stepDescription}
                          onChange={(event) =>
                            setStepDescription(event.target.value)
                          }
                          placeholder="Apraksti, kas šajā solī jādara..."
                          rows={4}
                          required
                        />
                      </label>

                      {/* SOĻA ATTĒLS */}
                      <div className="editor-step-extra-section">
                        <div className="editor-step-extra-heading">
                          <div>
                            <h3>Soļa attēls</h3>
                            <p>
                              Pievieno fotogrāfiju, kas parāda šī soļa
                              izpildi vai rezultātu.
                            </p>
                          </div>
                        </div>

                        {editingStepId &&
                          project.steps.some(
                            (step) =>
                              step.id === editingStepId &&
                              Boolean(step.imagePath),
                          ) && (
                            <p className="editor-help-text">
                              Šim solim jau ir attēls. Izvēlies citu,
                              lai to nomainītu, vai atstāj lauku tukšu,
                              lai saglabātu esošo.
                            </p>
                          )}

                        <label className="editor-field">
                          <span>Izvēlēties attēlu</span>

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={busy}
                            onChange={(event) => {
                              const file =
                                event.currentTarget.files?.[0] ?? null

                              event.currentTarget.value = ''

                              if (!file) return

                              if (
                                ![
                                  'image/jpeg',
                                  'image/png',
                                  'image/webp',
                                ].includes(file.type)
                              ) {
                                showError(
                                  new Error(
                                    'Atļauti tikai JPG, PNG un WEBP attēli.',
                                  ),
                                )
                                return
                              }

                              if (file.size > 5 * 1024 * 1024) {
                                showError(
                                  new Error(
                                    'Attēla izmērs nedrīkst pārsniegt 5 MB.',
                                  ),
                                )
                                return
                              }

                              setStepImageFile(file)
                              setError('')
                            }}
                          />
                        </label>

                        {stepImageFile && (
                          <p className="editor-selected-file">
                            <ImagePlus size={16} />
                            Izvēlēts: {stepImageFile.name}
                          </p>
                        )}
                      </div>

                      {/* SOĻA MATERIĀLI */}
                      <div className="editor-step-extra-section">
                        <div className="editor-step-extra-heading">
                          <div>
                            <h3>Nepieciešamie materiāli</h3>
                            <p>
                              Izvēlies materiālus no šī projekta krājuma
                              un norādi, cik daudz nepieciešams šim solim.
                            </p>
                          </div>

                          <button
                            type="button"
                            className="editor-secondary-button"
                            onClick={addStepMaterialDraft}
                            disabled={
                              busy ||
                              stepMaterialDrafts.length >=
                                project.materials.length
                            }
                          >
                            <Plus size={16} />
                            Pievienot materiālu
                          </button>
                        </div>

                        {project.materials.length === 0 ? (
                          <div className="editor-no-materials">
                            <Package size={22} />

                            <p>
                              Projektam vēl nav pievienotu materiālu.
                              Vispirms tos pievieno materiālu sadaļā.
                            </p>

                            <button
                              type="button"
                              className="editor-small-button"
                              onClick={() => setActiveTab('materials')}
                            >
                              Atvērt materiālus
                            </button>
                          </div>
                        ) : stepMaterialDrafts.length === 0 ? (
                          <p className="editor-help-text">
                            Šim solim vēl nav izvēlēti materiāli.
                          </p>
                        ) : (
                          <div className="editor-step-material-draft-list">
                            {stepMaterialDrafts.map((item, index) => {
                              const selectedMaterial = project.materials.find(
                                (material) => material.id === item.materialId,
                              )
                              const wholeUnit = selectedMaterial
                                ? usesWholeMaterialUnits(selectedMaterial.unit)
                                : false

                              return (
                                <div
                                  className="editor-step-material-row"
                                  key={`${item.materialId}-${index}`}
                                >
                                  <label className="editor-field">
                                    <span>Materiāls</span>

                                    <select
                                      value={item.materialId}
                                      onChange={(event) =>
                                        updateStepMaterialDraft(index, {
                                          materialId: event.target.value,
                                        })
                                      }
                                    >
                                      {project.materials.map((material) => {
                                        const alreadySelected =
                                          stepMaterialDrafts.some(
                                            (other, otherIndex) =>
                                              otherIndex !== index &&
                                              other.materialId === material.id,
                                          )

                                        return (
                                          <option
                                            key={material.id}
                                            value={material.id}
                                            disabled={alreadySelected}
                                          >
                                            {material.name} — atlikums:{' '}
                                            {Number(
                                              material.quantityAvailable,
                                            )}{' '}
                                            {material.unit}
                                          </option>
                                        )
                                      })}
                                    </select>
                                  </label>

                                  <label className="editor-field">
                                    <span>Nepieciešamais daudzums</span>

                                    <input
                                      type="number"
                                      min={wholeUnit ? 1 : 0.01}
                                      step={wholeUnit ? 1 : 0.01}
                                      value={item.quantityNeeded}
                                      onChange={(event) =>
                                        updateStepMaterialDraft(index, {
                                          quantityNeeded: event.target.value,
                                        })
                                      }
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    className="editor-icon-button editor-step-material-remove"
                                    onClick={() =>
                                      removeStepMaterialDraft(index)
                                    }
                                    aria-label="Noņemt materiālu no soļa"
                                    title="Noņemt materiālu"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="editor-form-actions">
                        <button
                          type="button"
                          className="editor-secondary-button"
                          onClick={closeStepForm}
                        >
                          Atcelt
                        </button>

                        <button
                          type="submit"
                          className="editor-primary-button"
                          disabled={busy}
                        >
                          <Save size={16} />
                          {busy
                            ? 'Saglabā...'
                            : editingStepId
                              ? 'Saglabāt izmaiņas'
                              : 'Pievienot soli'}
                        </button>
                      </div>
                    </form>
                  )}

                  {project.steps.length === 0 ? (
                    <div className="editor-empty-state">
                      <div className="editor-empty-icon">
                        <Layers3 size={35} />
                      </div>

                      <h3>Projektam vēl nav soļu</h3>

                      <p>
                        Sāc dokumentēt projekta tapšanas procesu.
                        Pievieno pirmo soli un paskaidro, ar ko sākt.
                      </p>

                      <button
                        type="button"
                        className="editor-primary-button"
                        onClick={openNewStepForm}
                      >
                        <Plus size={17} />
                        Pievienot pirmo soli
                      </button>
                    </div>
                  ) : (
                    <div className="editor-step-list">
                      {project.steps.map((step, index) => (
                        <article
                          className="editor-step-card"
                          key={step.id}
                        >
                          <div className="editor-step-number">
                            {String(step.stepNumber).padStart(2, '0')}
                          </div>

                          <div className="editor-step-image">
                            {step.imagePath ? (
                              <ProjectImage
                                src={`${API_URL}/images/steps/${step.id}`}
                                alt={step.title}
                                className="editor-step-photo"
                              />
                            ) : (
                              <div className="editor-step-image-empty">
                                <ImagePlus size={30} />
                                <span>Soļa attēls</span>
                              </div>
                            )}
                          </div>

                          <div className="editor-step-information">
                            <div className="editor-step-title-row">
                              <div>
                                <span className="editor-step-label">
                                  {`SOLIS ${step.stepNumber}`}
                                </span>

                                <h3>{step.title}</h3>
                              </div>

                              <div className="editor-step-order">
                                <button
                                  type="button"
                                  title="Pārvietot uz augšu"
                                  aria-label="Pārvietot soli uz augšu"
                                  disabled={busy || index === 0}
                                  onClick={() => void moveStep(index, -1)}
                                >
                                  <ArrowUp size={17} />
                                </button>

                                <button
                                  type="button"
                                  title="Pārvietot uz leju"
                                  aria-label="Pārvietot soli uz leju"
                                  disabled={
                                    busy ||
                                    index === project.steps.length - 1
                                  }
                                  onClick={() => void moveStep(index, 1)}
                                >
                                  <ArrowDown size={17} />
                                </button>
                              </div>
                            </div>

                            <p>{step.description}</p>

                            {step.materialsUsed.length > 0 && (
                              <div className="editor-step-materials">
                                <span>Materiāli šim solim:</span>

                                {step.materialsUsed.map((item) => (
                                  <span
                                    className="editor-material-chip"
                                    key={item.id}
                                  >
                                    {item.material.name}
                                    {' · '}
                                    {Number(item.quantityNeeded)}{' '}
                                    {item.material.unit}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="editor-step-actions">
                              <button
                                type="button"
                                className="editor-small-button"
                                onClick={() => openEditStepForm(step)}
                              >
                                <Pencil size={15} />
                                Rediģēt
                              </button>

                              <label className="editor-small-button">
                                <ImagePlus size={15} />
                                {step.imagePath
                                  ? 'Mainīt attēlu'
                                  : 'Pievienot attēlu'}

                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  hidden
                                  disabled={busy}
                                  onChange={(event) => {
                                    const file = event.currentTarget.files?.[0]
                                    event.currentTarget.value = ''

                                    if (file) {
                                      void uploadStepImage(step.id, file)
                                    }
                                  }}
                                />
                              </label>

                              {step.imagePath && (
                                <button
                                  type="button"
                                  className="editor-small-button"
                                  disabled={busy}
                                  onClick={() => void deleteStepImage(step)}
                                >
                                  <ImagePlus size={15} />
                                  Noņemt attēlu
                                </button>
                              )}

                              <button
                                type="button"
                                className="editor-small-button danger"
                                disabled={busy}
                                onClick={() => void deleteStep(step)}
                              >
                                <Trash2 size={15} />
                                Dzēst
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* ========================================
                  PAMATA INFORMĀCIJA
              ======================================== */}
              {activeTab === 'details' && (
                <section className="editor-section">
                  <div className="editor-section-heading">
                    <div>
                      <span className="workspace-eyebrow">
                        PROJEKTA INFORMĀCIJA
                      </span>

                      <h2>Pamata informācija</h2>

                      <p>
                        Pārvaldi projekta nosaukumu, aprakstu, kategoriju
                        un galveno attēlu.
                      </p>
                    </div>
                  </div>

                  <form
                    className="editor-panel"
                    onSubmit={saveProjectInfo}
                  >
                    <label className="editor-field">
                      <span>Projekta nosaukums</span>

                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(event) =>
                          setProjectTitle(event.target.value)
                        }
                        placeholder="Projekta nosaukums"
                        required
                        maxLength={150}
                      />
                    </label>

                    <label className="editor-field">
                      <span>Projekta apraksts</span>

                      <textarea
                        value={projectDescription}
                        onChange={(event) =>
                          setProjectDescription(event.target.value)
                        }
                        placeholder="Pastāsti par savu projektu..."
                        rows={6}
                        required
                      />
                    </label>

                    <label className="editor-field">
                      <span>Projekta kategorija</span>

                      <select
                        value={categoryId}
                        onChange={(event) =>
                          setCategoryId(event.target.value)
                        }
                      >
                        <option value="">Bez kategorijas</option>

                        {categories.map((category) => (
                          <option
                            value={category.id}
                            key={category.id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="editor-form-actions">
                      <button
                        type="submit"
                        className="editor-primary-button"
                        disabled={busy}
                      >
                        <Save size={16} />
                        Saglabāt informāciju
                      </button>
                    </div>
                  </form>

                  <div className="editor-panel editor-cover-settings">
                    <div className="editor-cover-settings-heading">
                      <div>
                        <h3>Projekta titulbilde</h3>
                        <p>
                          Šis attēls būs redzams projekta kartītē un
                          projekta publiskās lapas augšdaļā.
                        </p>
                      </div>
                    </div>

                    <div className="editor-cover-settings-preview">
                      {coverUrl ? (
                        <ProjectImage
                          src={coverUrl}
                          alt={project.title}
                          className="editor-cover-settings-image"
                        />
                      ) : (
                        <div className="editor-cover-settings-empty">
                          <ImagePlus size={35} />
                          <span>Titulbilde vēl nav pievienota</span>
                        </div>
                      )}

                      <div className="editor-cover-settings-actions">
                        <label className="editor-primary-button">
                          <ImagePlus size={16} />
                          {project.imagePath
                            ? 'Mainīt titulbildi'
                            : 'Pievienot titulbildi'}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={busy}
                            onChange={(event) => void uploadCover(event)}
                          />
                        </label>

                        {project.imagePath && (
                          <button
                            type="button"
                            className="editor-secondary-button"
                            disabled={busy}
                            onClick={() => void deleteCover()}
                          >
                            <Trash2 size={15} />
                            Noņemt
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="editor-help-text">
                      Atļauti JPG, PNG un WEBP attēli. Maksimālais
                      faila izmērs – 5 MB. Attēls tiks ievietots
                      vienādā titulbildes rāmī, nesabojājot tā proporcijas.
                    </p>
                  </div>
                </section>
              )}

              {/* ========================================
                  MATERIĀLI
              ======================================== */}
              {activeTab === 'materials' && (
                <section className="editor-section">
                  <div className="editor-section-heading">
                    <div>
                      <span className="workspace-eyebrow">
                        MATERIĀLU UZSKAITE
                      </span>

                      <h2>Projekta materiāli</h2>

                      <p>
                        Pievieno materiālus, kurus izmanto šī projekta
                        izveidē. Šeit vari pārvaldīt to pieejamo daudzumu
                        un savas privātās piezīmes.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="editor-primary-button"
                      onClick={openNewMaterialForm}
                      disabled={busy}
                    >
                      <Plus size={17} />
                      Pievienot materiālu
                    </button>
                  </div>

                  {materialShortages.length > 0 && (
                    <div
                      role="alert"
                      className="editor-material-shortage-alert"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '16px 18px',
                        marginBottom: '20px',
                        color: '#985243',
                        background: '#fff2ee',
                        border: '1px solid #f0d0c7',
                        borderRadius: '14px',
                      }}
                    >
                      <AlertTriangle
                        size={21}
                        style={{ flexShrink: 0, marginTop: '2px' }}
                      />

                      <div>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>
                          Projektam trūkst materiālu
                        </strong>

                        <p style={{ margin: '0 0 8px', fontSize: '13px', lineHeight: 1.5 }}>
                          Pieejamais atlikums nav pietiekams visu projekta soļu izpildei.
                        </p>

                        <ul style={{ margin: 0, paddingLeft: '19px', fontSize: '13px', lineHeight: 1.7 }}>
                          {materialShortages.map((summary) => (
                            <li key={summary.materialId}>
                              <strong>{summary.materialName}</strong>: trūkst{' '}
                              {formatQuantity(summary.shortage)} {summary.unit}
                              {' '}(vēl nepieciešams {formatQuantity(summary.remainingNeeded)} {summary.unit}, pieejams {formatQuantity(summary.available)} {summary.unit}).
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {materialFormOpen && (
                    <form
                      className="editor-material-form"
                      onSubmit={saveMaterial}
                    >
                      <div className="editor-form-heading">
                        <div>
                          <span className="workspace-eyebrow">
                            {editingMaterialId
                              ? 'MATERIĀLA REDIĢĒŠANA'
                              : 'JAUNS MATERIĀLS'}
                          </span>

                          <h3>
                            {editingMaterialId
                              ? 'Rediģēt materiālu'
                              : 'Pievienot projekta materiālu'}
                          </h3>
                        </div>

                        <button
                          type="button"
                          className="editor-icon-button"
                          onClick={closeMaterialForm}
                          aria-label="Aizvērt formu"
                        >
                          <X size={19} />
                        </button>
                      </div>

                      <label className="editor-field">
                        <span>Materiāla nosaukums</span>

                        <input
                          type="text"
                          value={materialName}
                          onChange={(event) =>
                            setMaterialName(event.target.value)
                          }
                          placeholder="Piemēram, koka dēļi"
                          maxLength={120}
                          required
                        />
                      </label>

                      <div className="editor-material-form-row">
                        <label className="editor-field">
                          <span>Mērvienība</span>

                          <input
                            type="text"
                            value={materialUnit}
                            onChange={(event) =>
                              setMaterialUnit(event.target.value)
                            }
                            placeholder="gab."
                            maxLength={20}
                            required
                          />
                        </label>

                        {!editingMaterialId && (
                          <label className="editor-field">
                            <span>Sākotnējais daudzums</span>

                            <input
                              type="number"
                              value={materialQuantity}
                              onChange={(event) =>
                                setMaterialQuantity(event.target.value)
                              }
                              min="0"
                              step={usesWholeMaterialUnits(materialUnit) ? 1 : 0.01}
                              required
                            />
                          </label>
                        )}
                      </div>

                      {editingMaterialId && (
                        <p className="editor-help-text">
                          Pieejamo daudzumu vari papildināt materiāla
                          kartītē. Tas ļauj atsevišķi uzskaitīt jaunus
                          materiālu iegādājumus.
                        </p>
                      )}

                      <label className="editor-field">
                        <span>Privātas piezīmes</span>

                        <textarea
                          value={materialNotes}
                          onChange={(event) =>
                            setMaterialNotes(event.target.value)
                          }
                          placeholder="Piemēram, kur materiāls iegādāts vai kādam nolūkam paredzēts..."
                          rows={3}
                        />
                      </label>

                      <div className="editor-form-actions">
                        <button
                          type="button"
                          className="editor-secondary-button"
                          onClick={closeMaterialForm}
                        >
                          Atcelt
                        </button>

                        <button
                          type="submit"
                          className="editor-primary-button"
                          disabled={busy}
                        >
                          <Save size={16} />
                          {busy
                            ? 'Saglabā...'
                            : editingMaterialId
                              ? 'Saglabāt izmaiņas'
                              : 'Pievienot materiālu'}
                        </button>
                      </div>
                    </form>
                  )}

                  {project.materials.length === 0 ? (
                    <div className="editor-empty-state">
                      <div className="editor-empty-icon">
                        <Package size={35} />
                      </div>

                      <h3>Projektam vēl nav materiālu</h3>

                      <p>
                        Pievieno pirmo materiālu, piemēram, koka dēļus,
                        skrūves, krāsu vai citus projektā izmantojamos
                        resursus.
                      </p>

                      <button
                        type="button"
                        className="editor-primary-button"
                        onClick={openNewMaterialForm}
                      >
                        <Plus size={17} />
                        Pievienot pirmo materiālu
                      </button>
                    </div>
                  ) : (
                    <div className="editor-material-list">
                      {project.materials.map((material) => {
                        const linkedSteps = getMaterialLinkedSteps(
                          material.id,
                        )

                        const quantity = Number(
                          material.quantityAvailable,
                        )
                        const balance = materialBalanceSummaries.find(
                          (summary) => summary.materialId === material.id,
                        )

                        return (
                          <article
                            className="editor-material-card"
                            key={material.id}
                          >
                            <div className="editor-material-main">
                              <div className="editor-material-icon">
                                <Package size={23} />
                              </div>

                              <div className="editor-material-information">
                                <h3>{material.name}</h3>

                                <span className="editor-material-stock">
                                  Pieejams:{' '}
                                  <strong>
                                    {quantity} {material.unit}
                                  </strong>
                                </span>

                                {linkedSteps.length > 0 ? (
                                  <p className="editor-material-linked">
                                    Piesaistīts {linkedSteps.length}{' '}
                                    {linkedSteps.length === 1
                                      ? 'projekta solim'
                                      : 'projekta soļiem'}
                                  </p>
                                ) : (
                                  <p className="editor-material-linked">
                                    Vēl nav piesaistīts projekta soļiem
                                  </p>
                                )}

                                {balance && balance.totalNeeded > 0 && (
                                  <>
                                    <p className="editor-material-linked">
                                      Soļiem paredzēts: {formatQuantity(balance.totalNeeded)} {material.unit}
                                    </p>

                                    {balance.totalUsed > 0 && (
                                      <p className="editor-material-linked">
                                        Jau izlietots: {formatQuantity(balance.totalUsed)} {material.unit}
                                      </p>
                                    )}

                                    <p className="editor-material-linked">
                                      Vēl nepieciešams: {formatQuantity(balance.remainingNeeded)} {material.unit}
                                    </p>
                                  </>
                                )}

                                {balance && balance.shortage > 0 && (
                                  <p
                                    style={{
                                      margin: '8px 0 0',
                                      color: '#a34f40',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Trūkst: {formatQuantity(balance.shortage)} {material.unit}
                                  </p>
                                )}
                              </div>
                            </div>

                            {material.notes && (
                              <div className="editor-material-notes">
                                <LockKeyhole size={14} />
                                <span>{material.notes}</span>
                              </div>
                            )}

                            <div className="editor-material-restock">
                              <label>
                                Papildināt atlikumu
                                <input
                                  type="number"
                                  min={usesWholeMaterialUnits(material.unit) ? 1 : 0.01}
                                  step={usesWholeMaterialUnits(material.unit) ? 1 : 0.01}
                                  value={restockValues[material.id] ?? ''}
                                  onChange={(event) =>
                                    setRestockValues((current) => ({
                                      ...current,
                                      [material.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={`Daudzums (${material.unit})`}
                                  disabled={busy}
                                />
                              </label>

                              <button
                                type="button"
                                className="editor-secondary-button"
                                disabled={busy}
                                onClick={() =>
                                  void restockMaterial(material)
                                }
                              >
                                <Plus size={15} />
                                Papildināt
                              </button>
                            </div>

                            <div className="editor-material-actions">
                              <button
                                type="button"
                                className="editor-small-button"
                                disabled={busy}
                                onClick={() =>
                                  openEditMaterialForm(material)
                                }
                              >
                                <Pencil size={15} />
                                Rediģēt
                              </button>

                              <button
                                type="button"
                                className="editor-small-button danger"
                                disabled={busy || linkedSteps.length > 0}
                                title={
                                  linkedSteps.length > 0
                                    ? 'Vispirms noņem materiālu no projekta soļiem'
                                    : 'Dzēst materiālu'
                                }
                                onClick={() =>
                                  void deleteMaterial(material)
                                }
                              >
                                <Trash2 size={15} />
                                Dzēst
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ========================================
                  GALERIJA
              ======================================== */}
              {activeTab === 'gallery' && (
                <section className="editor-section">
                  <div className="editor-section-heading">
                    <div>
                      <span className="workspace-eyebrow">
                        IDEJAS UN ATTĒLI
                      </span>

                      <h2>Projekta galerija</h2>

                      <p>
                        Šeit glabāsi papildu projekta attēlus, idejas
                        un piezīmes. Galerija pēc noklusējuma ir privāta.
                      </p>
                    </div>
                  </div>

                  <div className="editor-coming-soon">
                    <div className="editor-empty-icon">
                      <Images size={35} />
                    </div>

                    <h3>Galerijas pārvaldība</h3>

                    <p>
                      Attēlu pievienošanu, aprakstu rediģēšanu un
                      atsevišķu galerijas redzamības pārslēgšanu
                      pieslēgsim nākamajā izstrādes solī.
                    </p>
                  </div>
                </section>
              )}
            </div>

            {/* LABĀ PUSE – PROJEKTA STATUSS */}
            <aside className="editor-aside">
              <section className="editor-side-card">
                <div className="editor-side-heading">
                  <div className="editor-side-icon">
                    {project.isPublished ? (
                      <Eye size={19} />
                    ) : (
                      <LockKeyhole size={19} />
                    )}
                  </div>

                  <div>
                    <h3>Projekta redzamība</h3>
                    <span>
                      {project.isPublished
                        ? 'Pieejams citiem lietotājiem'
                        : 'Redzams tikai tev'}
                    </span>
                  </div>
                </div>

                <div
                  className={
                    project.isPublished
                      ? 'editor-side-status public'
                      : 'editor-side-status private'
                  }
                >
                  {project.isPublished ? 'Publisks' : 'Privāts'}
                </div>

                <p className="editor-side-description">
                  {project.isPublished
                    ? 'Citi lietotāji var apskatīt projekta soļus un nepieciešamos materiālus.'
                    : 'Projekta saturu pašlaik vari apskatīt tikai tu.'}
                </p>

                <button
                  type="button"
                  className={
                    project.isPublished
                      ? 'editor-side-button secondary'
                      : 'editor-side-button primary'
                  }
                  disabled={busy}
                  onClick={() => void toggleProjectVisibility()}
                >
                  {project.isPublished ? (
                    <>
                      <EyeOff size={16} />
                      Padarīt privātu
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      Publicēt projektu
                    </>
                  )}
                </button>
              </section>

              <section className="editor-side-card">
                <div className="editor-side-heading">
                  <div className="editor-side-icon completion">
                    <CheckCircle2 size={19} />
                  </div>

                  <div>
                    <h3>Projekta statuss</h3>
                    <span>Tu nosaki, kad darbs ir pabeigts</span>
                  </div>
                </div>

                <div
                  className={
                    isCompleted
                      ? 'editor-side-status completed'
                      : 'editor-side-status progress'
                  }
                >
                  {isCompleted ? 'Pabeigts' : 'Procesā'}
                </div>

                {project.completedAt && (
                  <p className="editor-completed-date">
                    Pabeigts: {formatDate(project.completedAt)}
                  </p>
                )}

                <p className="editor-side-description">
                  Soļu pievienošana automātiski nemaina projekta
                  pabeigšanas statusu. To kontrolē pats autors.
                </p>

                <button
                  type="button"
                  className={
                    isCompleted
                      ? 'editor-side-button secondary'
                      : 'editor-side-button primary'
                  }
                  disabled={busy}
                  onClick={() => void toggleCompletion()}
                >
                  {isCompleted ? (
                    <>
                      <Circle size={16} />
                      Atgriezt procesā
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Atzīmēt kā pabeigtu
                    </>
                  )}
                </button>
              </section>

              <section className="editor-side-card editor-summary-card">
                <div className="editor-side-heading">
                  <div className="editor-side-icon summary">
                    <Layers3 size={19} />
                  </div>

                  <div>
                    <h3>Projekta pārskats</h3>
                    <span>Pašreizējais saturs</span>
                  </div>
                </div>

                <div className="editor-summary-row">
                  <span>
                    <Layers3 size={15} />
                    Projekta soļi
                  </span>
                  <strong>{project.steps.length}</strong>
                </div>

                <div className="editor-summary-row">
                  <span>
                    <Package size={15} />
                    Materiāli
                  </span>
                  <strong>{project.materials.length}</strong>
                </div>

                <div className="editor-summary-row">
                  <span>
                    <Images size={15} />
                    Galerijas attēli
                  </span>
                  <strong>{project.galleryImages.length}</strong>
                </div>

                <div className="editor-summary-row">
                  <span>
                    <CalendarDays size={15} />
                    Izveidots
                  </span>
                  <strong>{formatDate(project.createdAt)}</strong>
                </div>
              </section>

              {project.isPublished && (
                <button
                  type="button"
                  className="editor-public-preview-button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  Apskatīt publisko projektu
                  <ArrowUpRight size={17} />
                </button>
              )}

              <p className="editor-private-note">
                <LockKeyhole size={14} />
                Galerija pēc noklusējuma vienmēr ir privāta.
              </p>
            </aside>
          </div>

          <footer className="workspace-footer">
            Do It Lab — idejām, kas pelnījušas kļūt īstas.
          </footer>
        </div>
      </main>
    </div>
  )
}

export default ProjectManagementPage