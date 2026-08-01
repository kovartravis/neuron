package main

import "fmt"

type DataPipeline struct {
	StreamID string
}

func IngestStream(streamID string) error {
	fmt.Println("Ingesting stream", streamID)
	return nil
}

func main() {
	IngestStream("stream_1")
}
