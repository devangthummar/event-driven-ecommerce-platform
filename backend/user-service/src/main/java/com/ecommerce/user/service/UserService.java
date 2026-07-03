package com.ecommerce.user.service;

import com.ecommerce.user.dto.request.LoginRequest;
import com.ecommerce.user.dto.request.RegisterRequest;
import com.ecommerce.user.dto.response.LoginResponse;
import com.ecommerce.user.dto.response.UserResponse;

public interface UserService {

    UserResponse registerUser(RegisterRequest request);
    LoginResponse login(LoginRequest request);
}