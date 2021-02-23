function logout(){
    localStorage.removeItem('username');
    window.location.href = "\\";
}