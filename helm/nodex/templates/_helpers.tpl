{{/*
Expand the name of the chart.
*/}}
{{- define "nodex.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
A "fullname" prefix used by every resource. Honors fullnameOverride and falls
back to "<release>-<chart>", so two releases can coexist in one namespace.
*/}}
{{- define "nodex.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Common labels shared by every object. The name/instance pair is what
`kubectl logs -l app.kubernetes.io/instance=<release>` keys off.
*/}}
{{- define "nodex.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/name: {{ include "nodex.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{/*
Selector labels. Deliberately excludes version and chart: Kubernetes rejects
mutating a Deployment's selector, so anything that changes on upgrade cannot
live here.
*/}}
{{- define "nodex.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nodex.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Image reference. Explicit tag wins, then Chart.AppVersion, so an unconfigured
chart still pulls a matching release.
*/}}
{{- define "nodex.image" -}}
{{- $reg := .Values.image.registry | default "docker.io" -}}
{{- $repo := .Values.image.repository -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- printf "%s/%s:%s" $reg $repo $tag -}}
{{- end -}}

{{/*
The Secret holding DATABASE_URL and the GitHub credentials, whether generated
by this chart or supplied by the user.
*/}}
{{- define "nodex.secretName" -}}
{{- if .Values.database.existingSecret -}}
{{- .Values.database.existingSecret -}}
{{- else -}}
{{- include "nodex.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Whether accounts are configured at all.

Used to decide if the migration hook and the database environment are rendered.
A deployment with no database is a supported, first-class mode: every language
is public and the registry is static, so the site works without one.
*/}}
{{- define "nodex.databaseConfigured" -}}
{{- if or .Values.database.url .Values.database.existingSecret -}}
true
{{- end -}}
{{- end -}}

{{/*
Environment shared by the server Deployment and the migration Job, so the two
cannot drift into pointing at different databases.
*/}}
{{- define "nodex.databaseEnv" -}}
{{- if include "nodex.databaseConfigured" . }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nodex.secretName" . }}
      key: {{ .Values.database.existingSecretKey | default "DATABASE_URL" }}
{{- end }}
{{- end -}}

{{/*
Fail early with a readable message rather than rendering something half broken.
*/}}
{{- define "nodex.validate" -}}
{{- if and .Values.database.url .Values.database.existingSecret -}}
{{- fail "Set either database.url or database.existingSecret, not both." -}}
{{- end -}}
{{- if and .Values.github.clientId (not .Values.github.clientSecret) (not .Values.github.existingSecret) -}}
{{- fail "github.clientId is set but github.clientSecret is not. Set both, or point github.existingSecret at a Secret carrying GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." -}}
{{- end -}}
{{- if and .Values.github.clientId (not (include "nodex.databaseConfigured" .)) -}}
{{- fail "GitHub sign-in needs somewhere to store sessions. Set database.url or database.existingSecret, or clear github.clientId for a public deployment." -}}
{{- end -}}
{{- if and .Values.github.clientId (not .Values.siteUrl) -}}
{{- fail "siteUrl is required when GitHub sign-in is enabled: the OAuth callback URL is built from it." -}}
{{- end -}}
{{- if and .Values.ingress.enabled (not .Values.ingress.hosts) -}}
{{- fail "ingress.enabled is true but ingress.hosts is empty." -}}
{{- end -}}
{{- end -}}
