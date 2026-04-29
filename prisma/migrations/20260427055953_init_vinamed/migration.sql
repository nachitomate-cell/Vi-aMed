-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_nac" DATETIME NOT NULL,
    "sexo" TEXT NOT NULL,
    "prevision" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "registro_sis" TEXT,
    "profesion" TEXT NOT NULL,
    "facultades" JSONB NOT NULL DEFAULT [],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paciente_id" TEXT NOT NULL,
    "tipo_examen" TEXT NOT NULL,
    "hallazgos" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "recomendaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "autor_id" TEXT NOT NULL,
    "firmante_id" TEXT,
    "last_edited_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "signed_at" DATETIME,
    CONSTRAINT "reports_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reports_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reports_firmante_id_fkey" FOREIGN KEY ("firmante_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reports_last_edited_by_id_fkey" FOREIGN KEY ("last_edited_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "cambios" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_rut_key" ON "pacientes"("rut");

-- CreateIndex
CREATE INDEX "pacientes_rut_idx" ON "pacientes"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "users_rut_key" ON "users"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_registro_sis_key" ON "users"("registro_sis");

-- CreateIndex
CREATE INDEX "users_rut_idx" ON "users"("rut");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_profesion_idx" ON "users"("profesion");

-- CreateIndex
CREATE INDEX "users_activo_idx" ON "users"("activo");

-- CreateIndex
CREATE INDEX "reports_autor_id_idx" ON "reports"("autor_id");

-- CreateIndex
CREATE INDEX "reports_firmante_id_idx" ON "reports"("firmante_id");

-- CreateIndex
CREATE INDEX "reports_paciente_id_idx" ON "reports"("paciente_id");

-- CreateIndex
CREATE INDEX "reports_estado_idx" ON "reports"("estado");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "reports_autor_id_estado_idx" ON "reports"("autor_id", "estado");

-- CreateIndex
CREATE INDEX "reports_paciente_id_estado_idx" ON "reports"("paciente_id", "estado");

-- CreateIndex
CREATE INDEX "audit_logs_report_id_idx" ON "audit_logs"("report_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_accion_idx" ON "audit_logs"("accion");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_report_id_created_at_idx" ON "audit_logs"("report_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
