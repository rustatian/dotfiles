package main

import (
	"fmt"
	"testing"
)

// As of Go1.16, `go test codelens2_test.go -list .` returns
//   TestFunction
//   Test1Function
//   TestΣυνάρτηση
//   Test함수
//   Test_foobar
//   Test
//   TestMain
//   ExampleFunction
//   Example

func TestFunction(t *testing.T) {
	t.Log("this is a valid test function")
}

func Testfunction(t *testing.T) {
	t.Fatal("this is not a valid test function")
}

func Test1Function(t *testing.T) {
	t.Log("this is an acceptable test function")
}

func TestΣυνάρτηση(t *testing.T) {
	t.Log("this is a valid test function")
}

func Testσυνάρτηση(t *testing.T) {
	t.Fatal("this is not a valid test function")
}

func Test함수(t *testing.T) {
	t.Log("this is a valid test function")
}

func Test_foobar(t *testing.T) {
	t.Log("this is an acceptable test function")
}

func Test(t *testing.T) {
	t.Log("this is a valid test function")
}

func TestMain(m *testing.T) {
	m.Log("this is a valid test function")
}

func ExampleFunction() {
	fmt.Println("this is a valid example function")
	// Output:
	// this is a valid example function
}

func Example() {
	fmt.Println("this is a valid example function")
	// Output:
	// this is a valid example function
}
