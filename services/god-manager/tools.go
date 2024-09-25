//go:build tools

/*

This file ensures that the tools needed are still included after
running `go mod tidy` and that the imports continue to work.

It will always show an error, but this can be safely ignored

*/

package main

import _ "github.com/DataDog/orchestrion"