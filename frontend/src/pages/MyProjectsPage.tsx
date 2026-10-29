
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProjectsPage.css";

type Project = {
  id: string;
  title: string;
  description: string;
  imagePath: string | null;
  isPublished: boolean;
  createdAt: string;
  category?: {
    name: string;
  } | null;
  _count?: {
    steps: number;
  };
};

const API_URL = "http://localhost:5000/api";

function MyProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/projects/mine`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Neizdevās ielādēt tavus projektus.",
        );
      }

      setProjects(data.projects ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Radās neparedzēta kļūda.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function toggleVisibility(project: Project) {
    const nextVisibility = !project.isPublished;

    const confirmed = window.confirm(
      nextVisibility
        ? `Vai vēlies publicēt projektu "${project.title}"?`
        : `Vai vēlies padarīt projektu "${project.title}" privātu?`,
    );

    if (!confirmed) return;

    setUpdatingId(project.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/projects/${project.id}/visibility`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isPublished: nextVisibility,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Neizdevās mainīt projekta redzamību.",
        );
      }

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? { ...item, isPublished: nextVisibility }
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Radās neparedzēta kļūda.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="my-projects-page">
        <nav className="my-projects-navigation">
          <button onClick={() => navigate("/dashboard")}>
            ← Sākums
          </button>

          <button onClick={() => navigate(-1)}>
            Profils
          </button>
        </nav>
      <header className="my-projects-header">
        <div>
          <p className="my-projects-eyebrow">MANA DARBNĪCA</p>
          <h1>Mani projekti</h1>
          <p className="my-projects-subtitle">
            Pārvaldi savus projektus un izvēlies, kurus vēlies
            parādīt citiem.
          </p>
        </div>

        <button
          className="my-projects-create-button"
          onClick={() => navigate("/projects/new")}
        >
          + Izveidot projektu
        </button>
      </header>

      <section className="my-projects-summary">
        <div className="my-projects-stat">
          <span>Visi projekti</span>
          <strong>{projects.length}</strong>
        </div>
        <div className="my-projects-stat">
          <span>Publicēti</span>
          <strong>
            {projects.filter((project) => project.isPublished).length}
          </strong>
        </div>
        <div className="my-projects-stat">
          <span>Privāti</span>
          <strong>
            {projects.filter((project) => !project.isPublished).length}
          </strong>
        </div>
      </section>

      {error && (
        <div className="my-projects-error" role="alert">
          {error}
          <button onClick={() => void loadProjects()}>
            Mēģināt vēlreiz
          </button>
        </div>
      )}

      {loading ? (
        <div className="my-projects-message">
          Ielādē projektus...
        </div>
      ) : projects.length === 0 ? (
        <section className="my-projects-empty">
          <div className="my-projects-empty-icon">✦</div>
          <h2>Te vēl nav neviena projekta</h2>
          <p>
            Izveido savu pirmo projektu un dokumentē tā tapšanas
            procesu.
          </p>
          <button
            className="my-projects-create-button"
            onClick={() => navigate("/projects/new")}
          >
            Izveidot pirmo projektu
          </button>
        </section>
      ) : (
        <section className="my-projects-grid">
          {projects.map((project) => (
            <article className="my-project-card" key={project.id}>
              <div className="my-project-image">
                {project.imagePath ? (
                  <img
                    src={
                      project.imagePath.startsWith("http")
                        ? project.imagePath
                        : `http://localhost:5000/${project.imagePath.replace(/^\/+/, "")}`
                    }
                    alt={project.title}
                  />
                ) : (
                  <span>✦</span>
                )}

                <span
                  className={`my-project-status ${
                    project.isPublished ? "published" : "private"
                  }`}
                >
                  {project.isPublished ? "Publicēts" : "Privāts"}
                </span>
              </div>

              <div className="my-project-content">
                {project.category && (
                  <p className="my-project-category">
                    {project.category.name}
                  </p>
                )}

                <h2>{project.title}</h2>
                <p className="my-project-description">
                  {project.description}
                </p>

                <div className="my-project-meta">
                  <span>
                    {project._count?.steps ?? 0} soļi
                  </span>
                  <span>
                    {new Date(project.createdAt).toLocaleDateString(
                      "lv-LV",
                    )}
                  </span>
                </div>

                <button
                  className={`my-project-visibility-button ${
                    project.isPublished ? "make-private" : "make-public"
                  }`}
                  disabled={updatingId === project.id}
                  onClick={() => void toggleVisibility(project)}
                >
                  {updatingId === project.id
                    ? "Saglabā..."
                    : project.isPublished
                      ? "Padarīt privātu"
                      : "Publicēt projektu"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default MyProjectsPage;
