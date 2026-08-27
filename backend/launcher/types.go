package launcher

type UpdateStatus struct {
	Type        string `json:"type"`
	Reason      string `json:"reason,omitempty"`
	Local       string `json:"local,omitempty"`
	Remote      string `json:"remote,omitempty"`
	DownloadURL string `json:"downloadUrl,omitempty"`
}

type LocalVersion struct {
	Version string `json:"version"`
	Status  string `json:"status,omitempty"`
	URL     string `json:"url_download,omitempty"`
}
