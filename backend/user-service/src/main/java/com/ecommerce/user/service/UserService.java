package com.ecommerce.user.service;

import com.ecommerce.user.dto.request.RegisterRequest;
import com.ecommerce.user.dto.response.UserResponse;

public interface UserService {

    UserResponse registerUser(RegisterRequest request);

}